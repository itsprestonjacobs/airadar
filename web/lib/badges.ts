export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold";
  type: "watch" | "weather";
  watchSeconds?: number; // for watch milestone badges
}

export const BADGE_DEFS: BadgeDef[] = [
  // Watch milestones
  {
    id: "first-watch",
    name: "First Watch",
    description: "Tuned in for the first time",
    icon: "📺",
    tier: "bronze",
    type: "watch",
    watchSeconds: 60,
  },
  {
    id: "weather-watcher",
    name: "Weather Watcher",
    description: "Watched for 1 hour total",
    icon: "🌤️",
    tier: "bronze",
    type: "watch",
    watchSeconds: 3_600,
  },
  {
    id: "storm-tracker",
    name: "Storm Tracker",
    description: "Watched for 10 hours total",
    icon: "⛈️",
    tier: "silver",
    type: "watch",
    watchSeconds: 36_000,
  },
  {
    id: "weather-nerd",
    name: "Weather Nerd",
    description: "Watched for 24 hours total",
    icon: "🌪️",
    tier: "silver",
    type: "watch",
    watchSeconds: 86_400,
  },
  {
    id: "storm-chaser",
    name: "Storm Chaser",
    description: "Watched for 100 hours total",
    icon: "🌩️",
    tier: "gold",
    type: "watch",
    watchSeconds: 360_000,
  },
  {
    id: "weather-obsessed",
    name: "Weather Obsessed",
    description: "Watched for 500 hours total",
    icon: "🌀",
    tier: "gold",
    type: "watch",
    watchSeconds: 1_800_000,
  },
  // Weather event badges (awarded by the bot when severe weather hits user's area)
  {
    id: "severe-weather",
    name: "Severe Weather",
    description: "Had a severe weather alert in your area",
    icon: "⚠️",
    tier: "bronze",
    type: "weather",
  },
  {
    id: "winter-storm",
    name: "Winter Storm",
    description: "Had a winter storm warning in your area",
    icon: "❄️",
    tier: "silver",
    type: "weather",
  },
  {
    id: "tornado-watch",
    name: "Tornado Watch",
    description: "Had a tornado watch or warning in your area",
    icon: "🌪️",
    tier: "silver",
    type: "weather",
  },
  {
    id: "hurricane-watch",
    name: "Hurricane Watch",
    description: "Had a hurricane watch or warning in your area",
    icon: "🌀",
    tier: "gold",
    type: "weather",
  },
];

export const BADGE_MAP = Object.fromEntries(BADGE_DEFS.map((b) => [b.id, b]));

export const TIER_COLORS: Record<BadgeDef["tier"], string> = {
  bronze: "#cd7f32",
  silver: "#a8a9ad",
  gold: "#ffd700",
};

/** Returns badge IDs the user should have based on watch seconds but doesn't yet. */
export function getNewWatchBadges(
  totalWatchSeconds: number,
  alreadyEarned: string[]
): string[] {
  return BADGE_DEFS.filter(
    (b) =>
      b.type === "watch" &&
      b.watchSeconds !== undefined &&
      totalWatchSeconds >= b.watchSeconds &&
      !alreadyEarned.includes(b.id)
  ).map((b) => b.id);
}

/** Returns the event badge ID for an NWS alert event string, if one matches. */
export function getWeatherEventBadgeId(eventName: string): string | null {
  const lower = eventName.toLowerCase();
  if (lower.includes("tornado")) return "tornado-watch";
  if (lower.includes("hurricane") || lower.includes("tropical storm")) return "hurricane-watch";
  if (lower.includes("winter storm") || lower.includes("blizzard") || lower.includes("ice storm")) return "winter-storm";
  if (lower.includes("severe thunderstorm") || lower.includes("severe weather")) return "severe-weather";
  return null;
}
