/** Supported stream types for the player. */
export type StreamType = "hls" | "dash" | "ts" | "mp4" | "unknown";

/** Detect stream type from a URL. */
export function detectStreamType(url: string): StreamType {
  const lower = url.toLowerCase();
  const path = new URL(url).pathname.toLowerCase();

  if (path.endsWith(".m3u8") || lower.includes("/hls/")) return "hls";
  if (path.endsWith(".mpd")) return "dash";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".mp4") || path.endsWith(".mkv")) return "mp4";

  // Check query params for format hints (common in IPTV providers)
  const params = new URL(url).searchParams;
  const output = params.get("output") || params.get("type") || "";
  if (output.includes("m3u8") || output.includes("hls")) return "hls";
  if (output.includes("mpegts") || output.includes("ts")) return "ts";

  return "unknown";
}

/** Check if a stream type should use Shaka Player (MSE-based). */
export function needsShaka(type: StreamType): boolean {
  return type === "hls" || type === "dash" || type === "unknown";
}
