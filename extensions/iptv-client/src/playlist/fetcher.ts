import { parseM3u } from "./parser.js";
import type { IptvPlaylist } from "./types.js";

/** Fetch and parse an M3U playlist from a URL. */
export async function fetchPlaylist(url: string): Promise<IptvPlaylist> {
  const res = await fetch(url, {
    headers: { "User-Agent": "ClawdbotIPTV/1.0" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch playlist: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseM3u(text);
}

/** Merge multiple playlists, deduplicating by stream URL. */
export function mergePlaylists(playlists: IptvPlaylist[]): IptvPlaylist {
  const seen = new Set<string>();
  const merged: IptvPlaylist = { channels: [], groups: [], attributes: {} };
  const groupSet = new Set<string>();
  let index = 1;

  for (const pl of playlists) {
    // Keep first playlist's attributes as base
    if (merged.attributes && Object.keys(merged.attributes).length === 0) {
      merged.attributes = { ...pl.attributes };
    }
    for (const ch of pl.channels) {
      if (seen.has(ch.url)) continue;
      seen.add(ch.url);
      merged.channels.push({ ...ch, index: index++ });
      if (ch.group) groupSet.add(ch.group);
    }
  }

  merged.groups = [...groupSet].sort();
  return merged;
}
