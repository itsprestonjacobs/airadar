import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BadgeDisplay from "@/components/BadgeDisplay";
import Link from "next/link";

function formatWatchTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      userBadges: { orderBy: { earnedAt: "desc" } },
      watchSessions: { orderBy: { startedAt: "desc" }, take: 5 },
    },
  });

  if (!user) redirect("/");

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  const earnedBadges = user.userBadges.map((b) => ({
    badgeId: b.badgeId,
    earnedAt: b.earnedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* Nav */}
      <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="text-sm hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
          ← Back to stream
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile card */}
        <div
          className="rounded-2xl p-6 flex items-center gap-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {user.image ? (
            <img src={user.image} alt={user.name ?? ""} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
              {user.name}
            </h1>
            <p className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
              {user.email}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
              Member since {user.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Watch Time", value: formatWatchTime(user.totalWatchSeconds) },
            { label: "Badges Earned", value: String(user.userBadges.length) },
            { label: "Location", value: user.locationName ?? "Not set" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl p-4 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="text-xl font-bold truncate" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Badges</h2>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--bg-panel)", color: "var(--text-secondary)" }}>
              {user.userBadges.length} earned
            </span>
          </div>
          <BadgeDisplay earnedBadges={earnedBadges} showLocked={true} />
        </div>

        <Link
          href="/settings"
          className="block text-center text-sm py-2 rounded-lg hover:opacity-80"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          ⚙️ Edit settings →
        </Link>
      </main>
    </div>
  );
}
