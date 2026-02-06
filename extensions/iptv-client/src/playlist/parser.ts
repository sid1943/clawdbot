import type { IptvChannel, IptvPlaylist } from "./types.js";

/**
 * Parse key="value" or key=value attributes from an EXTINF or EXTM3U line.
 * Handles both quoted and unquoted values.
 */
function parseAttributes(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // Match: key="value" or key=value (unquoted stops at space or comma)
  const re = /([\w-]+)="([^"]*)"|([\w-]+)=([^\s,"]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const key = m[1] ?? m[3];
    const val = m[2] ?? m[4];
    if (key && val !== undefined) attrs[key] = val;
  }
  return attrs;
}

/**
 * Extract the display name from an EXTINF line.
 * The name is the text after the last comma that isn't inside an attribute.
 */
function parseExtinfName(line: string): string {
  // EXTINF format: #EXTINF:-1 tvg-id="..." ...,Channel Name
  const commaIdx = line.lastIndexOf(",");
  if (commaIdx === -1) return "Unknown";
  return line.slice(commaIdx + 1).trim() || "Unknown";
}

/** Parse an M3U/M3U8 IPTV playlist string into structured data. */
export function parseM3u(content: string): IptvPlaylist {
  const lines = content.split(/\r?\n/);
  const channels: IptvChannel[] = [];
  const groupSet = new Set<string>();
  let playlistAttrs: Record<string, string> = {};

  let pendingExtinf: string | null = null;
  let channelIndex = 1;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Parse top-level #EXTM3U attributes
    if (line.startsWith("#EXTM3U")) {
      playlistAttrs = parseAttributes(line);
      continue;
    }

    // Collect EXTINF line (channel metadata)
    if (line.startsWith("#EXTINF:")) {
      pendingExtinf = line;
      continue;
    }

    // Skip other directives
    if (line.startsWith("#")) continue;

    // This is a URL line — pair it with the pending EXTINF
    const url = line;
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("rtsp://") && !url.startsWith("rtmp://")) {
      // Not a valid stream URL, skip
      pendingExtinf = null;
      continue;
    }

    const attrs = pendingExtinf ? parseAttributes(pendingExtinf) : {};
    const name = pendingExtinf ? parseExtinfName(pendingExtinf) : `Channel ${channelIndex}`;

    const group = attrs["group-title"] || undefined;
    if (group) groupSet.add(group);

    const channel: IptvChannel = {
      index: channelIndex++,
      name,
      url,
      logo: attrs["tvg-logo"] || undefined,
      group,
      tvgId: attrs["tvg-id"] || undefined,
      tvgName: attrs["tvg-name"] || undefined,
      language: attrs["tvg-language"] || undefined,
      country: attrs["tvg-country"] || undefined,
      extras: attrs,
    };

    channels.push(channel);
    pendingExtinf = null;
  }

  return {
    channels,
    groups: [...groupSet].sort(),
    attributes: playlistAttrs,
  };
}
