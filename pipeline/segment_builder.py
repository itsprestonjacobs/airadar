from __future__ import annotations

import logging
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


def build_segment(
    frames: list[bytes],
    audio_pcm: bytes,
    segment_dir: Path,
    fps: int = 30,
    width: int = 1280,
    height: int = 720,
    audio_sample_rate: int = 22050,
) -> Path:
    segment_dir.mkdir(parents=True, exist_ok=True)

    # Write PCM audio to a temp file so FFmpeg can read it as a second input
    with tempfile.NamedTemporaryFile(suffix=".pcm", delete=False, dir=segment_dir) as pcm_file:
        pcm_path = Path(pcm_file.name)
        pcm_file.write(audio_pcm)

    out_path = Path(tempfile.mktemp(suffix=".mp4", dir=segment_dir))

    cmd = [
        "ffmpeg", "-y",
        # Video: raw RGB from stdin
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{width}x{height}",
        "-r", str(fps),
        "-i", "pipe:0",
        # Audio: raw PCM from file
        "-f", "s16le",
        "-ar", str(audio_sample_rate),
        "-ac", "1",
        "-i", str(pcm_path),
        # Video encoding
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        # Audio encoding
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-ac", "2",
        # Container
        "-movflags", "+faststart",
        str(out_path),
    ]

    logger.info("Encoding segment: %d frames @ %dfps → %s", len(frames), fps, out_path.name)

    try:
        result = subprocess.run(
            cmd,
            input=b"".join(frames),
            capture_output=True,
            timeout=120,
        )
        if result.returncode != 0:
            logger.error("FFmpeg segment encode failed:\n%s", result.stderr.decode(errors="replace"))
            raise RuntimeError("FFmpeg encoding failed")
    finally:
        pcm_path.unlink(missing_ok=True)

    logger.info("Segment encoded: %s (%.1f MB)", out_path.name, out_path.stat().st_size / 1e6)
    return out_path
