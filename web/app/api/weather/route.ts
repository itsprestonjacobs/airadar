import { NextResponse } from "next/server";

const NWS_UA = "RadarWeatherBot/1.0 (contact@example.com)";
const NWS_HEADERS = { "User-Agent": NWS_UA, Accept: "application/geo+json" };

async function nwsFetch(url: string) {
  const res = await fetch(url, {
    headers: NWS_HEADERS,
    next: { revalidate: 300 }, // cache 5 minutes
  });
  if (!res.ok) throw new Error(`NWS ${url} → ${res.status}`);
  return res.json();
}

// Module-level cache for /points (rarely changes)
let pointsCache: { data: unknown; at: number } | null = null;

async function getGridInfo(lat: number, lon: number) {
  if (pointsCache && Date.now() - pointsCache.at < 86_400_000) {
    return pointsCache.data as { cwa: string; gridX: number; gridY: number };
  }
  const data = await nwsFetch(`https://api.weather.gov/points/${lat},${lon}`);
  const p = data.properties;
  const grid = { cwa: p.cwa, gridX: p.gridX, gridY: p.gridY };
  pointsCache = { data: grid, at: Date.now() };
  return grid;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "32.7767");
  const lon = parseFloat(searchParams.get("lon") ?? "-96.7970");
  const location = searchParams.get("location") ?? "Dallas-Fort Worth, TX";

  try {
    const grid = await getGridInfo(lat, lon);
    const { cwa, gridX, gridY } = grid;

    const [hourly, alerts] = await Promise.all([
      nwsFetch(`https://api.weather.gov/gridpoints/${cwa}/${gridX},${gridY}/forecast/hourly`),
      nwsFetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`),
    ]);

    const periods = hourly.properties.periods ?? [];
    const current = periods[0] ?? {};

    const windStr: string = current.windSpeed ?? "0 mph";
    const windMph = parseFloat(windStr) || 0;

    const activeAlerts = (alerts.features ?? []).map((f: { properties: Record<string, unknown> }) => ({
      event: f.properties.event,
      headline: f.properties.headline,
      severity: f.properties.severity,
      urgency: f.properties.urgency,
    }));

    return NextResponse.json({
      location,
      timestamp: new Date().toISOString(),
      temperature: current.temperature ?? null,
      temperatureUnit: current.temperatureUnit ?? "F",
      windSpeed: windMph,
      windDirection: current.windDirection ?? "",
      shortForecast: current.shortForecast ?? "",
      isDaytime: current.isDaytime ?? true,
      alerts: activeAlerts,
      hourly: periods.slice(0, 6).map((p: Record<string, unknown>) => ({
        startTime: p.startTime,
        temperature: p.temperature,
        temperatureUnit: p.temperatureUnit,
        windSpeed: p.windSpeed,
        windDirection: p.windDirection,
        shortForecast: p.shortForecast,
        isDaytime: p.isDaytime,
      })),
    });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
