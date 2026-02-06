import { parseM3u } from "../../src/playlist/parser.js";
import { mergePlaylists } from "../../src/playlist/fetcher.js";
import type { IptvChannel, IptvPlaylist } from "../../src/playlist/types.js";
import type { PlaylistConfig } from "../ui/settings-panel.js";
import { storageGetWithTtl, storageSetWithTtl } from "../storage.js";

const CACHE_KEY = "playlist_cache";

/** Fetch all configured playlists and merge them. */
export async function loadPlaylists(
  configs: PlaylistConfig[],
  cacheTtlMinutes: number,
): Promise<IptvPlaylist> {
  // Try cache first
  const cached = storageGetWithTtl<IptvPlaylist | null>(CACHE_KEY, null);
  if (cached && cached.channels.length > 0) {
    // Refresh in background
    refreshInBackground(configs, cacheTtlMinutes);
    return cached;
  }

  return fetchAndCachePlaylists(configs, cacheTtlMinutes);
}

/** Force refresh playlists, bypassing cache. */
export async function refreshPlaylists(
  configs: PlaylistConfig[],
  cacheTtlMinutes: number,
): Promise<IptvPlaylist> {
  return fetchAndCachePlaylists(configs, cacheTtlMinutes);
}

async function fetchAndCachePlaylists(
  configs: PlaylistConfig[],
  cacheTtlMinutes: number,
): Promise<IptvPlaylist> {
  const playlists: IptvPlaylist[] = [];

  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const res = await fetch(config.url, {
        headers: { "User-Agent": "ClawdbotIPTV/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return parseM3u(text);
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      playlists.push(result.value);
    } else {
      console.warn("[PlaylistManager] Failed to fetch playlist:", result.reason);
    }
  }

  const merged = mergePlaylists(playlists);

  // Cache the result
  storageSetWithTtl(CACHE_KEY, merged, cacheTtlMinutes);

  return merged;
}

function refreshInBackground(
  configs: PlaylistConfig[],
  cacheTtlMinutes: number,
): void {
  // Non-blocking background refresh
  fetchAndCachePlaylists(configs, cacheTtlMinutes).catch((err) => {
    console.warn("[PlaylistManager] Background refresh failed:", err);
  });
}

/** Search channels by name (case-insensitive substring match). */
export function searchChannels(
  channels: IptvChannel[],
  query: string,
): IptvChannel[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return channels;
  return channels.filter(
    (ch) =>
      ch.name.toLowerCase().includes(lower) ||
      (ch.group && ch.group.toLowerCase().includes(lower)) ||
      (ch.tvgName && ch.tvgName.toLowerCase().includes(lower)),
  );
}
