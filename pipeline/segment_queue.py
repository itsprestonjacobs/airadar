from __future__ import annotations

import logging
import os
import queue
from collections import deque
from pathlib import Path

logger = logging.getLogger(__name__)

_MAX_DISK_SEGMENTS = 10  # prune oldest segments beyond this count


class SegmentQueue:
    """Thread-safe queue of encoded MP4 segment paths with manifest management."""

    def __init__(self, manifest_path: Path) -> None:
        self._q: queue.Queue[Path] = queue.Queue()
        self._manifest = manifest_path
        self._all_segments: deque[Path] = deque()

    def put(self, segment_path: Path) -> None:
        self._q.put(segment_path)
        self._all_segments.append(segment_path)
        self._prune_old_segments()

    def get(self, timeout: float = 5.0) -> Path:
        return self._q.get(timeout=timeout)

    def qsize(self) -> int:
        return self._q.qsize()

    def update_manifest(self, upcoming: list[Path]) -> None:
        """Write the FFmpeg concat manifest atomically."""
        tmp = self._manifest.with_suffix(".tmp")
        lines = ["ffconcat version 1.0\n"]
        for p in upcoming:
            lines.append(f"file '{p}'\n")
        tmp.write_text("".join(lines))
        os.replace(tmp, self._manifest)

    def _prune_old_segments(self) -> None:
        while len(self._all_segments) > _MAX_DISK_SEGMENTS:
            old = self._all_segments.popleft()
            try:
                old.unlink(missing_ok=True)
                logger.debug("Pruned old segment: %s", old.name)
            except OSError:
                pass
