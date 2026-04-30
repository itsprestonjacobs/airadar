"use client";

import { useEffect, useState } from "react";

interface WeatherData {
  location: string;
  timestamp: string;
  temperature: number | null;
  temperatureUnit: string;
  windSpeed: number;
  windDirection: string;
  shortForecast: string;
  isDaytime: boolean;
  alerts: Array<{ event: string; headline: string; severity: string; urgency: string }>;
  hourly: Array<{
    startTime: string;
    temperature: number;
    temperatureUnit: string;
    windSpeed: string;
    windDirection: string;
    shortForecast: string;
    isDaytime: boolean;
  }>;
}

const WIND_ARROWS: Record<string, string> = {
  N: "↑", NNE: "↗", NE: "↗", ENE: "↗",
  E: "→", ESE: "↘", SE: "↘", SSE: "↘",
  S: "↓", SSW: "↙", SW: "↙", WSW: "↙",
  W: "←", WNW: "↖", NW: "↖", NNW: "↖",
};

function formatHour(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
}

export default function ConditionsPanel({
  lat,
  lon,
  location,
  initialData,
}: {
  lat: number;
  lon: number;
  location: string;
  initialData?: WeatherData;
}) {
  const [data, setData] = useState<WeatherData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialData ? new Date() : null);

  const fetchWeather = async () => {
    try {
      const res = await fetch(
        `/api/weather?lat=${lat}&lon=${lon}&location=${encodeURIComponent(location)}`
      );
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch {
      // silently keep old data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialData) fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="animate-pulse space-y-3 p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        {[40, 60, 40, 80, 40].map((w, i) => (
          <div key={i} className="h-4 rounded" style={{ width: `${w}%`, background: "var(--border)" }} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            Current Conditions
          </p>
          <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
            {data.location}
          </p>
        </div>
        {lastUpdated && (
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* Main temp */}
      <div className="px-4 py-4 flex items-end gap-4">
        <p className="text-7xl font-light tracking-tight" style={{ color: "var(--text-primary)" }}>
          {data.temperature !== null ? Math.round(data.temperature) : "--"}
          <span className="text-3xl" style={{ color: "var(--text-secondary)" }}>°{data.temperatureUnit}</span>
        </p>
        <div className="pb-2">
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{data.shortForecast}</p>
        </div>
      </div>

      {/* Wind */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <span className="text-lg" style={{ color: "var(--accent)" }}>
          {WIND_ARROWS[data.windDirection] ?? "→"}
        </span>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {Math.round(data.windSpeed)} mph {data.windDirection}
        </p>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)" }} />

      {/* Hourly strip */}
      {data.hourly.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
            Next 6 Hours
          </p>
          <div className="grid grid-cols-6 gap-1">
            {data.hourly.map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1 text-center">
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {i === 0 ? "Now" : formatHour(h.startTime)}
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {Math.round(h.temperature)}°
                </p>
                <p className="text-xs leading-tight" style={{ color: "var(--text-secondary)" }}>
                  {h.shortForecast.split(" ").slice(0, 2).join(" ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
