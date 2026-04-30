"use client";

import { BADGE_DEFS, BADGE_MAP, TIER_COLORS, type BadgeDef } from "@/lib/badges";

interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
}

interface Props {
  earnedBadges: EarnedBadge[];
  showLocked?: boolean;
}

function BadgeCard({ badge, earnedAt, locked }: { badge: BadgeDef; earnedAt?: string; locked: boolean }) {
  return (
    <div
      title={locked ? `${badge.name}: ${badge.description} (locked)` : `${badge.name}: ${badge.description}`}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center cursor-default transition-opacity"
      style={{
        background: locked ? "var(--bg-panel)" : "var(--bg-card)",
        border: `1px solid ${locked ? "var(--border)" : TIER_COLORS[badge.tier]}33`,
        opacity: locked ? 0.45 : 1,
        minWidth: "72px",
      }}
    >
      <span className="text-2xl">{badge.icon}</span>
      <div
        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: locked ? "var(--border)" : TIER_COLORS[badge.tier] + "22", color: locked ? "var(--text-dim)" : TIER_COLORS[badge.tier] }}
      >
        {badge.tier}
      </div>
      <p className="text-xs font-medium leading-tight" style={{ color: locked ? "var(--text-dim)" : "var(--text-primary)" }}>
        {badge.name}
      </p>
      {earnedAt && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          {new Date(earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}
    </div>
  );
}

export default function BadgeDisplay({ earnedBadges, showLocked = true }: Props) {
  const earnedMap = Object.fromEntries(earnedBadges.map((b) => [b.badgeId, b.earnedAt]));
  const watchBadges = BADGE_DEFS.filter((b) => b.type === "watch");
  const weatherBadges = BADGE_DEFS.filter((b) => b.type === "weather");

  function renderGroup(badges: BadgeDef[], label: string) {
    const visible = showLocked ? badges : badges.filter((b) => earnedMap[b.id]);
    if (!visible.length) return null;
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        <div className="flex flex-wrap gap-3">
          {visible.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earnedAt={earnedMap[badge.id]}
              locked={!earnedMap[badge.id]}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(watchBadges, "Watch Milestones")}
      {renderGroup(weatherBadges, "Weather Events")}
    </div>
  );
}
