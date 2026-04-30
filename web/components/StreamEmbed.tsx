"use client";

// Replace with your YouTube channel's live stream video ID or set NEXT_PUBLIC_YOUTUBE_LIVE_ID env var
const DEFAULT_VIDEO_ID = process.env.NEXT_PUBLIC_YOUTUBE_LIVE_ID ?? "live_stream";

export default function StreamEmbed({ videoId = DEFAULT_VIDEO_ID }: { videoId?: string }) {
  const src =
    videoId === "live_stream"
      ? `https://www.youtube.com/embed?listType=user_uploads&list=${process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? ""}&autoplay=1&mute=1`
      : `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;

  return (
    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
      {videoId === "live_stream" && !process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <span className="text-5xl mb-4">📡</span>
          <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Stream not configured
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Set <code className="font-mono px-1 py-0.5 rounded" style={{ background: "var(--bg-panel)" }}>
              NEXT_PUBLIC_YOUTUBE_LIVE_ID
            </code> in <code className="font-mono">.env.local</code>
          </p>
        </div>
      ) : (
        <iframe
          className="absolute inset-0 w-full h-full rounded-xl"
          src={src}
          title="Radar Weather Live Stream"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
