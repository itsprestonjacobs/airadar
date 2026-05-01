import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, ADMIN_EMAILS } from "@/lib/admins";
import { BADGE_MAP } from "@/lib/badges";
import AdminActions from "./AdminActions";

function fmt(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdmin(session.user.email)) redirect("/");

  const [users, totalUsers, totalWatchSeconds] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { userBadges: true },
      take: 100,
    }),
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { totalWatchSeconds: true } }),
  ]);

  const totalHours = Math.floor(
    (totalWatchSeconds._sum.totalWatchSeconds ?? 0) / 3600
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
            ← Stream
          </Link>
          <span style={{ color: "var(--border)" }}>·</span>
          <div className="flex items-center gap-2">
            <span className="text-base">🛠️</span>
            <h1 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
              Admin Dashboard
            </h1>
          </div>
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ background: "#1e3a5f", color: "#60a5fa" }}
        >
          {session.user.email}
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: String(totalUsers), icon: "👥" },
            { label: "Total Watch Hours", value: `${totalHours}h`, icon: "📺" },
            { label: "Admin Accounts", value: String(ADMIN_EMAILS.length), icon: "🛡️" },
            { label: "Badges Defined", value: String(Object.keys(BADGE_MAP).length), icon: "🏅" },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Admin accounts panel */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
            Hardcoded Admin Accounts
          </h2>
          <div className="space-y-2">
            {ADMIN_EMAILS.map((email) => {
              const u = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
              return (
                <div
                  key={email}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🛡️</span>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{email}</span>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={u
                      ? { background: "#14532d", color: "#86efac" }
                      : { background: "var(--bg-base)", color: "var(--text-dim)" }
                    }
                  >
                    {u ? "Registered" : "Not yet signed up"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: "var(--text-dim)" }}>
            To add admins, edit <code className="font-mono" style={{ color: "var(--text-secondary)" }}>web/lib/admins.ts</code>
          </p>
        </div>

        {/* Users table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
              Users ({totalUsers})
            </h2>
          </div>
          <div style={{ background: "var(--bg-panel)" }}>
            {users.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-dim)" }}>
                No users yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["User", "Joined", "Watch Time", "Badges", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isAdmin(u.email) && (
                            <span title="Admin" className="text-xs">🛡️</span>
                          )}
                          <div>
                            <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                              {u.name}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-dim)" }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                        {u.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                        {fmt(u.totalWatchSeconds)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.userBadges.length === 0 ? (
                            <span style={{ color: "var(--text-dim)" }}>—</span>
                          ) : (
                            u.userBadges.map((b) => (
                              <span key={b.badgeId} title={BADGE_MAP[b.badgeId]?.name ?? b.badgeId} className="text-base">
                                {BADGE_MAP[b.badgeId]?.icon ?? "🏅"}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <AdminActions userId={u.id} userName={u.name} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
