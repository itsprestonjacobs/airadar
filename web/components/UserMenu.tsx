"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import AuthModal from "./AuthModal";
import { ADMIN_EMAILS } from "@/lib/admins";

export default function UserMenu() {
  const { data: session, isPending } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (isPending) {
    return <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "var(--border)" }} />;
  }

  if (!session) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Sign in
        </button>
        {showModal && <AuthModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  const user = session.user;
  const admin = ADMIN_EMAILS.includes((user.email ?? "").toLowerCase());
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full transition-opacity hover:opacity-80"
      >
        {user.image ? (
          <img src={user.image} alt={user.name ?? ""} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {initials}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {user.name?.split(" ")[0] ?? user.email}
        </span>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-xl py-1 shadow-xl"
          style={{ zIndex: 1100, background: "var(--bg-panel)", border: "1px solid var(--border)" }}
        >
          <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{user.name}</p>
              {admin && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: "#1e3a5f", color: "#60a5fa" }}>
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs truncate" style={{ color: "var(--text-dim)" }}>{user.email}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            👤 Profile &amp; badges
          </Link>
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            ⚙️ Settings
          </Link>
          {admin && (
            <>
              <div style={{ borderTop: "1px solid var(--border)" }} />
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:opacity-70"
                style={{ color: "#60a5fa" }}
              >
                🛠️ Admin dashboard
              </Link>
            </>
          )}
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <button
            onClick={async () => { setMenuOpen(false); await signOut(); }}
            className="flex items-center gap-2 px-3 py-2 text-sm w-full text-left hover:opacity-70"
            style={{ color: "#f87171" }}
          >
            ↩ Sign out
          </button>
        </div>
      )}
    </div>
  );
}
