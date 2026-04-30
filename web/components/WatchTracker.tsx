"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";

const PING_INTERVAL_MS = 30_000; // 30 seconds

export default function WatchTracker() {
  const { data: session } = useSession();
  const sessionIdRef = useRef<string | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    async function ping() {
      try {
        const res = await fetch("/api/watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        });
        if (!res.ok) return;
        const data = await res.json();
        sessionIdRef.current = data.sessionId;

        if (data.newBadges?.length) {
          setNewBadges(data.newBadges);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 5000);
        }
      } catch {
        // network error — keep trying
      }
    }

    ping();
    const interval = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!showToast || !newBadges.length) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 animate-bounce"
      style={{ background: "var(--bg-panel)", border: "1px solid var(--accent)", maxWidth: "280px" }}
    >
      <span className="text-2xl">🏅</span>
      <div>
        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          Badge{newBadges.length > 1 ? "s" : ""} earned!
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Check your profile to see your new badge{newBadges.length > 1 ? "s" : ""}.
        </p>
      </div>
      <button onClick={() => setShowToast(false)} className="ml-auto text-sm" style={{ color: "var(--text-dim)" }}>✕</button>
    </div>
  );
}
