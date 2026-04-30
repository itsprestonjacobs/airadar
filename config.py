from dataclasses import dataclass, field
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    ANTHROPIC_API_KEY: str
    ELEVENLABS_API_KEY: str
    ELEVENLABS_VOICE_ID: str
    YOUTUBE_RTMP_KEY: str

    LAT: float
    LON: float
    LOCATION_NAME: str
    TIMEZONE: str

    STREAM_WIDTH: int = 1280
    STREAM_HEIGHT: int = 720
    STREAM_FPS: int = 30
    VIDEO_BITRATE: str = "3000k"

    SEGMENT_DURATION_S: int = 75
    LOOKAHEAD_SEGMENTS: int = 2

    SEGMENT_DIR: Path = field(default_factory=lambda: Path("/tmp/radar_segments"))
    CONCAT_MANIFEST: Path = field(default_factory=lambda: Path("/tmp/radar_playlist.txt"))
    ASSET_DIR: Path = field(default_factory=lambda: Path(__file__).parent / "graphics" / "assets")

    NWS_USER_AGENT: str = "RadarWeatherBot/1.0 (contact@example.com)"


def load_config() -> Config:
    return Config(
        ANTHROPIC_API_KEY=os.environ["ANTHROPIC_API_KEY"],
        ELEVENLABS_API_KEY=os.environ["ELEVENLABS_API_KEY"],
        ELEVENLABS_VOICE_ID=os.environ["ELEVENLABS_VOICE_ID"],
        YOUTUBE_RTMP_KEY=os.environ["YOUTUBE_RTMP_KEY"],
        LAT=float(os.environ["LOCATION_LAT"]),
        LON=float(os.environ["LOCATION_LON"]),
        LOCATION_NAME=os.environ["LOCATION_NAME"],
        TIMEZONE=os.environ["TIMEZONE"],
    )
