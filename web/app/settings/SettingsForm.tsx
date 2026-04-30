"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  initialName: string;
  initialLocationLat?: number;
  initialLocationLon?: number;
  initialLocationName?: string;
  initialAlertsEnabled: boolean;
}

export default function SettingsForm({
  userId,
  initialName,
  initialLocationLat,
  initialLocationLon,
  initialLocationName,
  initialAlertsEnabled,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [locationName, setLocationName] = useState(initialLocationName ?? "");
  const [locationLat, setLocationLat] = useState(String(initialLocationLat ?? ""));
  const [locationLon, setLocationLon] = useState(String(initialLocationLon ?? ""));
  const [alertsEnabled, setAlertsEnabled] = useState(initialAlertsEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function useCurrentLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setLocationLat(String(latitude.toFixed(4)));
      setLocationLon(String(longitude.toFixed(4)));

      // Reverse geocode using NWS
      try {
        const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}&location=My+Location`);
        const data = await res.json();
        if (data.location) setLocationName(data.location);
      } catch { /* ignore */ }
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          locationLat: locationLat ? parseFloat(locationLat) : null,
          locationLon: locationLon ? parseFloat(locationLon) : null,
          locationName: locationName || null,
          alertsEnabled,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Name */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Profile</h2>
        <div>
          <label className="block text-sm mb-1.5 font-medium" style={{ color: "var(--text-primary)" }}>Display name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      {/* Location */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Location</h2>
          <button
            type="button"
            onClick={useCurrentLocation}
            className="text-xs px-2.5 py-1 rounded-lg hover:opacity-80"
            style={{ background: "var(--bg-panel)", color: "var(--accent)", border: "1px solid var(--border)" }}
          >
            📍 Use my location
          </button>
        </div>
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          Used to show local conditions and award weather event badges.
        </p>
        <div>
          <label className="block text-sm mb-1.5 font-medium" style={{ color: "var(--text-primary)" }}>City / location name</label>
          <input
            type="text"
            placeholder="e.g. Dallas-Fort Worth, TX"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1.5 font-medium" style={{ color: "var(--text-primary)" }}>Latitude</label>
            <input
              type="number"
              step="0.0001"
              placeholder="32.7767"
              value={locationLat}
              onChange={(e) => setLocationLat(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 font-medium" style={{ color: "var(--text-primary)" }}>Longitude</label>
            <input
              type="number"
              step="0.0001"
              placeholder="-96.7970"
              value={locationLon}
              onChange={(e) => setLocationLon(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-panel)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>Weather Alerts</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              className="sr-only"
              checked={alertsEnabled}
              onChange={(e) => setAlertsEnabled(e.target.checked)}
            />
            <div
              className="w-10 h-6 rounded-full transition-colors"
              style={{ background: alertsEnabled ? "var(--accent)" : "var(--border)" }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: alertsEnabled ? "translateX(20px)" : "translateX(4px)" }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Email me severe weather alerts</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
              Get notified when NWS issues alerts for your saved location. Requires a location to be set above.
            </p>
          </div>
        </label>
      </div>

      {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        {saving ? "Saving…" : saved ? "✓ Saved!" : "Save settings"}
      </button>
    </form>
  );
}
