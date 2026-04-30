from __future__ import annotations

import logging
import queue
import signal
import sys
import threading
import time
from pathlib import Path
from typing import Optional

from config import load_config
from weather.nws_client import fetch_snapshot, WeatherSnapshot
from weather.radar_client import fetch_radar_png
from ai.claude_client import generate_commentary, prewarm_cache
from ai.tts_client import synthesize
from graphics.compositor import generate_segment_frames
from pipeline.segment_builder import build_segment
from pipeline.segment_queue import SegmentQueue
from pipeline.stream_writer import StreamWriter, rtmp_url

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("main")

_WATCHDOG_AVAILABLE = False
try:
    import sdnotify
    _WATCHDOG_AVAILABLE = True
except ImportError:
    pass


def _notify(msg: str) -> None:
    if _WATCHDOG_AVAILABLE:
        sdnotify.SystemdNotifier().notify(msg)


def produce_segment(
    cfg,
    segment_count: int,
    last_audio: Optional[bytes],
) -> tuple[Path, bytes]:
    """
    Fetch data, generate commentary, synthesize audio, render frames, encode MP4.
    Returns (segment_path, audio_pcm) — audio returned so it can be reused as fallback.
    """
    logger.info("--- Building segment #%d ---", segment_count)

    # Weather data
    snapshot = fetch_snapshot(
        cfg.LAT, cfg.LON, cfg.LOCATION_NAME, cfg.NWS_USER_AGENT
    )

    # Radar — fetch two frames for crossfade (start and ~5 min later cache)
    radar_start = fetch_radar_png(cfg.STREAM_WIDTH, cfg.STREAM_HEIGHT)
    time.sleep(1)  # brief pause so second fetch may pull a newer frame from cache
    radar_end = fetch_radar_png(cfg.STREAM_WIDTH, cfg.STREAM_HEIGHT)

    # Commentary
    try:
        commentary = generate_commentary(snapshot)
        logger.info("Commentary: %s", commentary[:80] + "...")
    except Exception as exc:
        logger.warning("Commentary generation failed (%s), using fallback text", exc)
        commentary = (
            f"Currently in {snapshot.location_name}: {snapshot.temperature_f:.0f} degrees, "
            f"{snapshot.sky_condition}. Wind {snapshot.wind_speed_mph:.0f} miles per hour "
            f"out of the {snapshot.wind_direction}. Stay tuned for updates."
        )

    # TTS
    try:
        audio_pcm = synthesize(
            commentary,
            cfg.ELEVENLABS_VOICE_ID,
            cfg.ELEVENLABS_API_KEY,
        )
    except Exception as exc:
        logger.warning("TTS failed (%s), reusing previous audio", exc)
        if last_audio is None:
            raise RuntimeError("TTS failed and no previous audio to fall back to") from exc
        audio_pcm = last_audio

    # Video frames
    frames = generate_segment_frames(
        snapshot,
        radar_start,
        radar_end,
        cfg.ASSET_DIR,
        fps=cfg.STREAM_FPS,
        duration_s=cfg.SEGMENT_DURATION_S,
    )

    # Encode MP4
    segment_path = build_segment(
        frames,
        audio_pcm,
        cfg.SEGMENT_DIR,
        fps=cfg.STREAM_FPS,
        width=cfg.STREAM_WIDTH,
        height=cfg.STREAM_HEIGHT,
    )

    return segment_path, audio_pcm


def main() -> None:
    cfg = load_config()
    cfg.SEGMENT_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("Starting Radar Weather Bot")
    logger.info("Location: %s (%.4f, %.4f)", cfg.LOCATION_NAME, cfg.LAT, cfg.LON)

    # Prewarm Claude prompt cache
    try:
        prewarm_cache()
    except Exception as exc:
        logger.warning("Cache prewarm failed: %s", exc)

    seg_queue = SegmentQueue(cfg.CONCAT_MANIFEST)
    writer = StreamWriter(
        manifest_path=cfg.CONCAT_MANIFEST,
        rtmp_destination=rtmp_url(cfg.YOUTUBE_RTMP_KEY),
        video_bitrate=cfg.VIDEO_BITRATE,
        fps=cfg.STREAM_FPS,
    )

    stop_event = threading.Event()

    def _handle_signal(signum, frame):
        logger.info("Caught signal %d, shutting down...", signum)
        stop_event.set()

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    # Producer thread: generates segments ahead of playback
    producer_exc: list[Exception] = []
    pending_segments: list[Path] = []
    last_audio: Optional[bytes] = None
    segment_count = 0

    def producer_loop() -> None:
        nonlocal last_audio, segment_count
        while not stop_event.is_set():
            # Only produce if we're below the lookahead limit
            if seg_queue.qsize() >= cfg.LOOKAHEAD_SEGMENTS:
                time.sleep(2)
                continue

            try:
                seg_path, audio = produce_segment(cfg, segment_count, last_audio)
                last_audio = audio
                segment_count += 1
                pending_segments.append(seg_path)
                seg_queue.update_manifest(pending_segments[-cfg.LOOKAHEAD_SEGMENTS * 2:])
                seg_queue.put(seg_path)
                logger.info("Queued segment #%d (queue depth: %d)", segment_count, seg_queue.qsize())
            except Exception as exc:
                logger.error("Segment production failed: %s", exc, exc_info=True)
                producer_exc.append(exc)
                time.sleep(10)

    producer_thread = threading.Thread(target=producer_loop, daemon=True, name="SegmentProducer")

    # Build first segment before starting the stream
    logger.info("Building initial segment...")
    try:
        seg_path, audio = produce_segment(cfg, segment_count, None)
        last_audio = audio
        segment_count += 1
        pending_segments.append(seg_path)
        seg_queue.update_manifest(pending_segments)
        seg_queue.put(seg_path)
    except Exception as exc:
        logger.critical("Failed to build initial segment: %s", exc)
        sys.exit(1)

    producer_thread.start()
    writer.start()

    _notify("READY=1")
    logger.info("Stream started")

    # Main watchdog loop
    try:
        while not stop_event.is_set():
            _notify(f"WATCHDOG=1\nSTATUS=Streaming segment #{segment_count} | queue:{seg_queue.qsize()}")

            if not writer.is_alive():
                logger.error("StreamWriter thread died unexpectedly, restarting...")
                writer.start()

            time.sleep(30)
    finally:
        logger.info("Shutting down...")
        stop_event.set()
        writer.stop()


if __name__ == "__main__":
    main()
