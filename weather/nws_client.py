from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

import requests

logger = logging.getLogger(__name__)

_POINTS_CACHE: dict[tuple, tuple] = {}  # (lat, lon) → (grid_info, fetched_at)
_FORECAST_CACHE: tuple[Optional["WeatherSnapshot"], float] = (None, 0.0)
_FORECAST_TTL = 600  # 10 minutes
_POINTS_TTL = 86400  # 24 hours


@dataclass
class AlertInfo:
    event: str
    headline: str
    severity: str
    urgency: str


@dataclass
class WeatherSnapshot:
    timestamp: datetime
    location_name: str
    temperature_f: float
    wind_speed_mph: float
    wind_direction: str
    sky_condition: str
    short_forecast: str
    active_alerts: list[AlertInfo] = field(default_factory=list)
    hourly_periods: list[dict] = field(default_factory=list)

    def to_prompt_text(self) -> str:
        alerts_text = ""
        if self.active_alerts:
            items = [f"- {a.event}: {a.headline}" for a in self.active_alerts]
            alerts_text = "\nACTIVE ALERTS:\n" + "\n".join(items)

        periods_text = ""
        if self.hourly_periods:
            lines = []
            for p in self.hourly_periods[:3]:
                lines.append(
                    f"  {p.get('startTime', '')[:16]}: "
                    f"{p.get('temperature', '?')}°{p.get('temperatureUnit', 'F')}, "
                    f"{p.get('shortForecast', '')}"
                )
            periods_text = "\nNEXT FEW HOURS:\n" + "\n".join(lines)

        return (
            f"Location: {self.location_name}\n"
            f"Time: {self.timestamp.strftime('%Y-%m-%d %H:%M UTC')}\n"
            f"Temperature: {self.temperature_f:.0f}°F\n"
            f"Wind: {self.wind_speed_mph:.0f} mph {self.wind_direction}\n"
            f"Sky: {self.sky_condition}\n"
            f"Forecast: {self.short_forecast}"
            f"{alerts_text}"
            f"{periods_text}"
        )


def _get(url: str, user_agent: str, timeout: int = 10) -> dict:
    headers = {"User-Agent": user_agent, "Accept": "application/geo+json"}
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def _get_grid_info(lat: float, lon: float, user_agent: str) -> dict:
    key = (round(lat, 4), round(lon, 4))
    cached = _POINTS_CACHE.get(key)
    if cached and (time.time() - cached[1]) < _POINTS_TTL:
        return cached[0]

    data = _get(f"https://api.weather.gov/points/{lat},{lon}", user_agent)
    props = data["properties"]
    grid_info = {
        "cwa": props["cwa"],
        "gridX": props["gridX"],
        "gridY": props["gridY"],
        "city": props.get("relativeLocation", {}).get("properties", {}).get("city", ""),
        "state": props.get("relativeLocation", {}).get("properties", {}).get("state", ""),
    }
    _POINTS_CACHE[key] = (grid_info, time.time())
    return grid_info


def fetch_snapshot(
    lat: float,
    lon: float,
    location_name: str,
    user_agent: str,
    force_refresh: bool = False,
) -> WeatherSnapshot:
    global _FORECAST_CACHE

    cached_snapshot, cached_at = _FORECAST_CACHE
    if not force_refresh and cached_snapshot and (time.time() - cached_at) < _FORECAST_TTL:
        logger.debug("Using cached weather snapshot")
        return cached_snapshot

    grid = _get_grid_info(lat, lon, user_agent)
    cwa, gx, gy = grid["cwa"], grid["gridX"], grid["gridY"]

    hourly_url = f"https://api.weather.gov/gridpoints/{cwa}/{gx},{gy}/forecast/hourly"
    alerts_url = f"https://api.weather.gov/alerts/active?point={lat},{lon}"

    hourly_data = _get(hourly_url, user_agent)
    alerts_data = _get(alerts_url, user_agent)

    periods = hourly_data["properties"]["periods"]
    current = periods[0] if periods else {}

    temp_f = float(current.get("temperature", 0))
    wind_str = current.get("windSpeed", "0 mph")
    wind_mph = float(wind_str.split()[0]) if wind_str else 0.0
    wind_dir = current.get("windDirection", "N")
    sky = current.get("shortForecast", "Unknown")
    forecast = current.get("shortForecast", "")

    alerts: list[AlertInfo] = []
    for feature in alerts_data.get("features", []):
        p = feature.get("properties", {})
        alerts.append(AlertInfo(
            event=p.get("event", ""),
            headline=p.get("headline", ""),
            severity=p.get("severity", ""),
            urgency=p.get("urgency", ""),
        ))

    snapshot = WeatherSnapshot(
        timestamp=datetime.utcnow(),
        location_name=location_name,
        temperature_f=temp_f,
        wind_speed_mph=wind_mph,
        wind_direction=wind_dir,
        sky_condition=sky,
        short_forecast=forecast,
        active_alerts=alerts,
        hourly_periods=periods[:3],
    )

    _FORECAST_CACHE = (snapshot, time.time())
    return snapshot
