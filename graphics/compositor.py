from __future__ import annotations

import logging
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Optional, TYPE_CHECKING

from PIL import Image, ImageDraw, ImageFont

if TYPE_CHECKING:
    from weather.nws_client import WeatherSnapshot

logger = logging.getLogger(__name__)

W, H = 1280, 720
PANEL_X = int(W * 0.70)  # data panel starts at 70% width
BG_COLOR = (10, 14, 26)
PANEL_COLOR = (20, 28, 50, 210)
ALERT_BAR_COLOR = (180, 20, 20, 230)
TEXT_COLOR = (230, 240, 255)
DIM_COLOR = (140, 160, 200)
ACCENT_COLOR = (80, 160, 255)

_FONT_CACHE: dict[int, ImageFont.FreeTypeFont] = {}


def _font(size: int, asset_dir: Path) -> ImageFont.FreeTypeFont:
    if size not in _FONT_CACHE:
        font_path = asset_dir / "fonts" / "Inter-Regular.ttf"
        bold_path = asset_dir / "fonts" / "Inter-Bold.ttf"
        try:
            _FONT_CACHE[size] = ImageFont.truetype(str(bold_path if size >= 24 else font_path), size)
        except OSError:
            _FONT_CACHE[size] = ImageFont.load_default()
    return _FONT_CACHE[size]


def _draw_rounded_rect(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    radius: int,
    fill: tuple,
) -> None:
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)


def render_frame(
    snapshot: "WeatherSnapshot",
    radar_png: bytes,
    asset_dir: Path,
    alert_scroll_offset: int = 0,
    now: Optional[datetime] = None,
) -> Image.Image:
    if now is None:
        now = datetime.now(timezone.utc)

    frame = Image.new("RGB", (W, H), BG_COLOR)

    # Radar layer (left 70% + bleed)
    radar_img = Image.open(BytesIO(radar_png)).convert("RGBA")
    radar_crop = radar_img.crop((0, 0, int(W * 0.73), H))
    radar_bg = Image.new("RGB", (int(W * 0.73), H), BG_COLOR)
    radar_bg.paste(radar_crop, mask=radar_crop.split()[3])
    frame.paste(radar_bg, (0, 0))

    # Semi-transparent data panel (right 30%)
    panel = Image.new("RGBA", (W - PANEL_X, H), PANEL_COLOR)
    frame.paste(Image.alpha_composite(frame.crop((PANEL_X, 0, W, H)).convert("RGBA"), panel).convert("RGB"), (PANEL_X, 0))

    draw = ImageDraw.Draw(frame)

    # Station bug (top left)
    _draw_rounded_rect(draw, (12, 12, 200, 52), 6, (20, 28, 50, 200))
    draw.text((20, 18), "RADAR WEATHER", font=_font(18, asset_dir), fill=ACCENT_COLOR)

    # Data panel content
    px = PANEL_X + 16
    py = 24

    draw.text((px, py), snapshot.location_name.upper(), font=_font(16, asset_dir), fill=DIM_COLOR)
    py += 28

    draw.text((px, py), f"{snapshot.temperature_f:.0f}°F", font=_font(52, asset_dir), fill=TEXT_COLOR)
    py += 62

    draw.line([(px, py), (W - 16, py)], fill=(60, 80, 120), width=1)
    py += 12

    draw.text((px, py), "CONDITIONS", font=_font(13, asset_dir), fill=DIM_COLOR)
    py += 20
    draw.text((px, py), snapshot.sky_condition, font=_font(20, asset_dir), fill=TEXT_COLOR)
    py += 32

    draw.text((px, py), "WIND", font=_font(13, asset_dir), fill=DIM_COLOR)
    py += 20
    draw.text((px, py), f"{snapshot.wind_speed_mph:.0f} mph {snapshot.wind_direction}", font=_font(20, asset_dir), fill=TEXT_COLOR)
    py += 32

    if snapshot.hourly_periods:
        draw.line([(px, py), (W - 16, py)], fill=(60, 80, 120), width=1)
        py += 12
        draw.text((px, py), "NEXT HOURS", font=_font(13, asset_dir), fill=DIM_COLOR)
        py += 20
        for period in snapshot.hourly_periods[:3]:
            time_str = period.get("startTime", "")[:13].replace("T", " ")
            temp = period.get("temperature", "?")
            cond = period.get("shortForecast", "")[:20]
            draw.text((px, py), f"{time_str}  {temp}°  {cond}", font=_font(14, asset_dir), fill=DIM_COLOR)
            py += 22

    # Active alert banner (bottom bar)
    if snapshot.active_alerts:
        bar_h = 36
        alert_bar = Image.new("RGBA", (W, bar_h), ALERT_BAR_COLOR)
        frame.paste(Image.alpha_composite(frame.crop((0, H - bar_h, W, H)).convert("RGBA"), alert_bar).convert("RGB"), (0, H - bar_h))
        draw2 = ImageDraw.Draw(frame)
        alert_text = "  ⚠  " + "   |   ".join(f"{a.event}: {a.headline}" for a in snapshot.active_alerts[:2])
        # Scroll: shift text left by offset pixels, wrap
        draw2.text((8 - (alert_scroll_offset % (len(alert_text) * 8 + W)), H - bar_h + 9), alert_text, font=_font(16, asset_dir), fill=(255, 230, 80))

    # Timestamp (bottom right)
    ts = now.strftime("%H:%M UTC  %b %d")
    draw.text((W - 160, H - 26), ts, font=_font(14, asset_dir), fill=DIM_COLOR)

    return frame


def generate_segment_frames(
    snapshot: "WeatherSnapshot",
    radar_png_start: bytes,
    radar_png_end: bytes,
    asset_dir: Path,
    fps: int = 30,
    duration_s: int = 75,
) -> list[bytes]:
    """
    Generate all frames for a segment using crossfade between two radar keyframes.
    Returns list of raw RGB bytes (one per frame).
    """
    total_frames = fps * duration_s
    crossfade_start = fps * 30  # begin crossfade at 30 seconds

    frame_a = render_frame(snapshot, radar_png_start, asset_dir)
    frame_b = render_frame(snapshot, radar_png_end, asset_dir)

    frames: list[bytes] = []
    for i in range(total_frames):
        alert_offset = i * 2  # scroll at 2 px/frame

        if i < crossfade_start:
            # Render frame_a with current scroll offset
            f = render_frame(snapshot, radar_png_start, asset_dir, alert_scroll_offset=alert_offset)
        elif i < crossfade_start + fps * 3:
            # 3-second crossfade
            alpha = (i - crossfade_start) / (fps * 3)
            f = Image.blend(frame_a, frame_b, alpha)
            # Re-render dynamic elements on top of blend
            f = render_frame(snapshot, radar_png_end, asset_dir, alert_scroll_offset=alert_offset)
        else:
            f = render_frame(snapshot, radar_png_end, asset_dir, alert_scroll_offset=alert_offset)

        frames.append(f.tobytes())

    return frames
