import { parseXmltv } from "../../src/epg/xmltv-parser.js";
import { EpgStore } from "../../src/epg/epg-store.js";
import type { PlaylistConfig } from "../ui/settings-panel.js";

const epgStore = new EpgStore();
let refreshInterval: ReturnType<typeof setInterval> | null = null;

/** Get the shared EPG store instance. */
export function getEpgStore(): EpgStore {
  return epgStore;
}

/** Fetch and parse EPG data from configured sources. */
export async function loadEpg(configs: PlaylistConfig[]): Promise<EpgStore> {
  const epgUrls = configs
    .map((c) => c.epgUrl)
    .filter((url): url is string => !!url);

  if (epgUrls.length === 0) return epgStore;

  const results = await Promise.allSettled(
    epgUrls.map(async (url) => {
      const res = await fetch(url, {
        headers: { "User-Agent": "ClawdbotIPTV/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Handle gzipped XMLTV (common for EPG files)
      let text: string;
      if (url.endsWith(".gz")) {
        const blob = await res.blob();
        const ds = new DecompressionStream("gzip");
        const stream = blob.stream().pipeThrough(ds);
        text = await new Response(stream).text();
      } else {
        text = await res.text();
      }

      return parseXmltv(text);
    }),
  );

  // Merge all EPG data into the store
  for (const result of results) {
    if (result.status === "fulfilled") {
      epgStore.load(result.value);
    } else {
      console.warn("[EpgManager] Failed to fetch EPG:", result.reason);
    }
  }

  return epgStore;
}

/** Start periodic EPG refresh. */
export function startEpgRefresh(
  configs: PlaylistConfig[],
  intervalMs = 6 * 60 * 60_000,
): void {
  stopEpgRefresh();
  refreshInterval = setInterval(() => {
    loadEpg(configs).catch((err) => {
      console.warn("[EpgManager] Refresh failed:", err);
    });
  }, intervalMs);
}

/** Stop periodic EPG refresh. */
export function stopEpgRefresh(): void {
  if (refreshInterval !== null) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}
