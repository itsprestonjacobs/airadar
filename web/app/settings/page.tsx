import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsForm from "./SettingsForm";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <header className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/profile" className="text-sm hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
          ← Back to profile
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>Settings</h1>
        <SettingsForm
          userId={user.id}
          initialName={user.name}
          initialLocationLat={user.locationLat ?? undefined}
          initialLocationLon={user.locationLon ?? undefined}
          initialLocationName={user.locationName ?? undefined}
          initialAlertsEnabled={user.alertsEnabled}
        />
      </main>
    </div>
  );
}
