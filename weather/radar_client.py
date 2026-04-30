from __future__ import annotations

import logging
import time
from io import BytesIO
from typing import Optional

import requests
from PIL import Image

logger = logging.getLogger(__name__)

_RADAR_CACHE: tuple[Optional[bytes], float] = (None, 0.0)
_RADAR_TTL = 300  # 5 minutes (NWS radar updates every ~5 min)

IEM_WMS_URL = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi"
NWS_FALLBACK_URL = (
    "https://mapservices.weather.noaa.gov/eventdriven/rest/services"
    "/radar/radar_base_reflectivity/MapServer/export"
)

CONUS_BBOX = "-130,20,-60,55"


def fetch_radar_png(
    width: int = 1280,
    height: int = 720,
    force_refresh: bool = False,
) -> bytes:
    global _RADAR_CACHE

    cached_png, cached_at = _RADAR_CACHE
    if not force_refresh and cached_png and (time.time() - cached_at) < _RADAR_TTL:
        logger.debug("Using cached radar image")
        return cached_png

    png = _fetch_iem(width, height)
    if png is None:
        logger.warning("IEM radar fetch failed, trying NWS fallback")
        png = _fetch_nws_fallback(width, height)

    if png is None:
        if cached_png:
            logger.warning("All radar sources failed, reusing last good frame")
            return cached_png
        raise RuntimeError("Could not fetch radar image from any source")

    _RADAR_CACHE = (png, time.time())
    return png


def _fetch_iem(width: int, height: int) -> Optional[bytes]:
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.1.1",
        "REQUEST": "GetMap",
        "LAYERS": "nexrad-n0r",
        "STYLES": "",
        "SRS": "EPSG:4326",
        "BBOX": CONUS_BBOX,
        "WIDTH": str(width),
        "HEIGHT": str(height),
        "FORMAT": "image/png",
        "TIME": "current",
        "TRANSPARENT": "true",
    }
    try:
        resp = requests.get(IEM_WMS_URL, params=params, timeout=15)
        resp.raise_for_status()
        if "image" not in resp.headers.get("Content-Type", ""):
            logger.warning("IEM returned non-image content type: %s", resp.headers.get("Content-Type"))
            return None
        return _ensure_rgba_png(resp.content, width, height)
    except Exception as exc:
        logger.warning("IEM fetch error: %s", exc)
        return None


def _fetch_nws_fallback(width: int, height: int) -> Optional[bytes]:
    params = {
        "bbox": CONUS_BBOX,
        "bboxSR": "4326",
        "size": f"{width},{height}",
        "imageSR": "4326",
        "format": "png32",
        "transparent": "false",
        "f": "image",
    }
    try:
        resp = requests.get(NWS_FALLBACK_URL, params=params, timeout=15)
        resp.raise_for_status()
        return _ensure_rgba_png(resp.content, width, height)
    except Exception as exc:
        logger.warning("NWS fallback fetch error: %s", exc)
        return None


def _ensure_rgba_png(raw: bytes, width: int, height: int) -> bytes:
    img = Image.open(BytesIO(raw)).convert("RGBA")
    if img.size != (width, height):
        img = img.resize((width, height), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
