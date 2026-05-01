"use client";

import { useState } from "react";
import { BADGE_DEFS } from "@/lib/badges";

export default function AdminActions({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function awardBadge(badgeId: string) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/award-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, badgeId }),
      });
      const data = await res.json();
      setMsg(data.ok ? `✓ Awarded ${badgeId}` : data.error ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setMsg(""); }}
        className="text-xs px-2.5 py-1 rounded-lg hover:opacity-80 transition-opacity"
        style={{ background: "var(--bg-base)", color: "var(--accent)", border: "1px solid var(--border)" }}
      >
        Award badge ▾
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-56 rounded-xl py-1 z-20 shadow-xl"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border)" }}
        >
          <p className="px-3 py-1.5 text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
            Award to {userName}
          </p>
          {BADGE_DEFS.map((b) => (
            <button
              key={b.id}
              onClick={() => awardBadge(b.id)}
              disabled={busy}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>{b.icon}</span>
              <span>{b.name}</span>
            </button>
          ))}
          {msg && (
            <p className="px-3 py-2 text-xs border-t" style={{ borderColor: "var(--border)", color: msg.startsWith("✓") ? "#86efac" : "#fca5a5" }}>
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
