import { Suspense } from "react";
import AlertsBanner from "@/components/AlertsBanner";
import ConditionsPanel from "@/components/ConditionsPanel";
import StreamEmbed from "@/components/StreamEmbed";
import RadarMapLoader from "@/components/RadarMapLoader";
import UserMenu from "@/components/UserMenu";

const LAT = parseFloat(process.env.LOCATION_LAT ?? "37.5");
const LON = parseFloat(process.env.LOCATION_LON ?? "-95.5");
const LOCATION = process.env.LOCATION_NAME ?? "United States";

async function getInitialWeather() {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(
      `${base}/api/weather?lat=${LAT}&lon=${LON}&location=${encodeURIComponent(LOCATION)}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const initialWeather = await getInitialWeather();
  const alerts = initialWeather?.alerts ?? [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Active alerts banner */}
      {alerts.length > 0 && <AlertsBanner alerts={alerts} />}

      {/* Nav */}
      <header
        className="sticky top-0 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-base)", zIndex: 1000 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📡</span>
          <div>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Radar Weather
            </h1>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              AI-powered 24/7 weather stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="live-dot w-2 h-2 rounded-full inline-block"
              style={{ background: "#ef4444" }}
            />
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#ef4444" }}
            >
              Live
            </span>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Stream + conditions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StreamEmbed />
          </div>
          <div>
            <Suspense fallback={<ConditionsSkeleton />}>
              <ConditionsPanel
                lat={LAT}
                lon={LON}
                location={LOCATION}
                initialData={initialWeather}
              />
            </Suspense>
          </div>
        </div>

        {/* Interactive radar map */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-secondary)" }}
            >
              Live NEXRAD Radar
            </h2>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              Updates every 5 min · Iowa Environmental Mesonet
            </span>
          </div>
          <Suspense fallback={<MapSkeleton />}>
            <RadarMapLoader lat={LAT} lon={LON} zoom={4} />
          </Suspense>
        </section>

        {/* About */}
        <section
          className="rounded-xl px-6 py-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            About Radar Weather
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Radar Weather is a 24/7 AI weather broadcast powered by live NEXRAD radar data,
            NOAA National Weather Service alerts, and AI-generated voice commentary. The stream
            runs continuously — automatically analyzing current conditions and severe weather
            across the country so you always have up-to-date coverage.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              "24/7 Live Stream",
              "NEXRAD Radar",
              "NWS Alerts",
              "AI Voice Commentary",
              "Severe Weather Coverage",
            ].map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: "var(--bg-panel)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      </main>

      <footer
        className="px-6 py-4 text-center"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          Weather data from{" "}
          <a
            href="https://www.weather.gov"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-secondary)" }}
          >
            NOAA / NWS
          </a>{" "}
          and{" "}
          <a
            href="https://mesonet.agron.iastate.edu"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-secondary)" }}
          >
            Iowa Environmental Mesonet
          </a>
          . For official forecasts visit{" "}
          <a
            href="https://www.weather.gov"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-secondary)" }}
          >
            weather.gov
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

function ConditionsSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl p-4 space-y-3"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        minHeight: "200px",
      }}
    >
      {[60, 80, 40, 60, 40].map((w, i) => (
        <div
          key={i}
          className="h-4 rounded"
          style={{ width: `${w}%`, background: "var(--border)" }}
        />
      ))}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div
      className="rounded-xl flex items-center justify-center"
      style={{
        height: "420px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        Loading radar map…
      </p>
    </div>
  );
}
