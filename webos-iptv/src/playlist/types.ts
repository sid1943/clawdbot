/** A single IPTV channel parsed from an M3U playlist. */
export type IptvChannel = {
  /** 1-based index within the playlist. */
  index: number;
  /** Display name from EXTINF line. */
  name: string;
  /** Stream URL (HTTP/HTTPS). */
  url: string;
  /** Channel logo URL (tvg-logo). */
  logo?: string;
  /** Group/category (group-title). */
  group?: string;
  /** XMLTV channel ID for EPG matching (tvg-id). */
  tvgId?: string;
  /** Alternative display name (tvg-name). */
  tvgName?: string;
  /** Language tag (tvg-language). */
  language?: string;
  /** Country code (tvg-country). */
  country?: string;
  /** Any extra key=value attributes from EXTINF. */
  extras: Record<string, string>;
};

/** A parsed M3U playlist. */
export type IptvPlaylist = {
  channels: IptvChannel[];
  /** Unique group names found in the playlist. */
  groups: string[];
  /** Top-level playlist attributes from #EXTM3U line. */
  attributes: Record<string, string>;
};
