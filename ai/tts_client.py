from __future__ import annotations

import logging
import threading
import time
from typing import Optional

from elevenlabs.client import ElevenLabs

logger = logging.getLogger(__name__)

_SAMPLE_RATE = 22050
_TTS_MODEL = "eleven_turbo_v2_5"
_OUTPUT_FORMAT = "pcm_22050"

_client: ElevenLabs | None = None
_semaphore = threading.Semaphore(1)


def get_client(api_key: str) -> ElevenLabs:
    global _client
    if _client is None:
        _client = ElevenLabs(api_key=api_key)
    return _client


def synthesize(
    text: str,
    voice_id: str,
    api_key: str,
    max_retries: int = 3,
) -> bytes:
    client = get_client(api_key)
    with _semaphore:
        for attempt in range(max_retries):
            try:
                audio_bytes = b""
                for chunk in client.text_to_speech.convert(
                    text=text,
                    voice_id=voice_id,
                    model_id=_TTS_MODEL,
                    output_format=_OUTPUT_FORMAT,
                ):
                    audio_bytes += chunk
                logger.info("TTS synthesized %d bytes for %d chars", len(audio_bytes), len(text))
                return audio_bytes
            except Exception as exc:
                wait = 2 ** attempt
                logger.warning("TTS attempt %d failed (%s), retrying in %ds", attempt + 1, exc, wait)
                if attempt < max_retries - 1:
                    time.sleep(wait)

    raise RuntimeError(f"TTS failed after {max_retries} attempts")


def pcm_to_wav(pcm: bytes, sample_rate: int = _SAMPLE_RATE) -> bytes:
    """Wrap raw PCM s16le mono bytes in a WAV header for debugging / ffplay."""
    import struct
    num_channels = 1
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    data_size = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,
        b"WAVE",
        b"fmt ",
        16,
        1,  # PCM
        num_channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + pcm
