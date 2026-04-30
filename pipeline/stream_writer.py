from __future__ import annotations

import logging
import subprocess
import threading
import time
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

YOUTUBE_RTMP_BASE = "rtmp://a.rtmp.youtube.com/live2"


def rtmp_url(stream_key: str) -> str:
    return f"{YOUTUBE_RTMP_BASE}/{stream_key}"


class StreamWriter:
    """
    Long-lived FFmpeg process that reads from the concat manifest and
    streams to YouTube via RTMP. Automatically restarts on failure.
    """

    def __init__(
        self,
        manifest_path: Path,
        rtmp_destination: str,
        video_bitrate: str = "3000k",
        fps: int = 30,
    ) -> None:
        self._manifest = manifest_path
        self._dest = rtmp_destination
        self._bitrate = video_bitrate
        self._fps = fps
        self._proc: Optional[subprocess.Popen] = None
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True, name="StreamWriter")
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._proc and self._proc.poll() is None:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._proc.kill()

    def is_alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def _build_cmd(self) -> list[str]:
        return [
            "ffmpeg",
            "-re",
            "-f", "concat",
            "-safe", "0",
            "-i", str(self._manifest),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-tune", "zerolatency",
            "-b:v", self._bitrate,
            "-maxrate", self._bitrate,
            "-bufsize", str(int(self._bitrate.rstrip("k")) * 2) + "k",
            "-pix_fmt", "yuv420p",
            "-g", str(self._fps * 2),  # keyframe every 2 seconds
            "-c:a", "aac",
            "-b:a", "128k",
            "-ar", "44100",
            "-ac", "2",
            "-f", "flv",
            self._dest,
        ]

    def _run(self) -> None:
        backoff = 5
        while not self._stop_event.is_set():
            if not self._manifest.exists():
                logger.info("Waiting for manifest to appear...")
                time.sleep(2)
                continue

            logger.info("Starting FFmpeg RTMP stream → %s", self._dest.split("/")[-1][:8] + "****")
            cmd = self._build_cmd()
            self._proc = subprocess.Popen(
                cmd,
                stderr=subprocess.PIPE,
            )

            stderr_thread = threading.Thread(
                target=self._drain_stderr,
                args=(self._proc,),
                daemon=True,
            )
            stderr_thread.start()

            exit_code = self._proc.wait()

            if self._stop_event.is_set():
                break

            logger.warning("FFmpeg exited with code %d, restarting in %ds...", exit_code, backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)

    def _drain_stderr(self, proc: subprocess.Popen) -> None:
        for line in proc.stderr:
            decoded = line.decode(errors="replace").rstrip()
            if decoded:
                logger.debug("ffmpeg: %s", decoded)
