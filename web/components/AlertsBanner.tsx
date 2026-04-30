"use client";

interface Alert {
  event: string;
  headline: string;
  severity: string;
  urgency: string;
}

export default function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return null;

  const isExtreme = alerts.some((a) =>
    ["Extreme", "Severe"].includes(a.severity)
  );

  const text = alerts.map((a) => `⚠ ${a.event}: ${a.headline}`).join("   |   ");

  return (
    <div
      className="w-full overflow-hidden py-2 px-4"
      style={{
        background: isExtreme ? "#7f1d1d" : "#78350f",
        borderBottom: `1px solid ${isExtreme ? "#991b1b" : "#92400e"}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="shrink-0 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider"
          style={{ background: isExtreme ? "#dc2626" : "#d97706", color: "#fff" }}
        >
          {isExtreme ? "ALERT" : "ADVISORY"}
        </span>
        <div className="overflow-hidden flex-1">
          <p className="alert-scroll text-sm font-medium" style={{ color: "#fde68a" }}>
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
