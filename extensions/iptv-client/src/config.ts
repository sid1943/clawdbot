/** IPTV client extension configuration schema. */

export type IptvClientConfig = {
  playlists: Array<{
    name: string;
    url: string;
    epgUrl?: string;
    autoRefreshMinutes?: number;
  }>;
  defaultDevice?: string;
  appId?: string;
};

const DEFAULT_CONFIG: IptvClientConfig = {
  playlists: [
    {
      name: "Indian Channels",
      url: "https://iptv-org.github.io/iptv/countries/in.m3u",
      epgUrl: "https://iptv-org.github.io/epg/guides/in/tataplay.com.epg.xml.gz",
    },
    {
      name: "World Sports",
      url: "https://iptv-org.github.io/iptv/categories/sports.m3u",
    },
  ],
};

export function parseIptvConfig(value: unknown): IptvClientConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_CONFIG;
  }

  const raw = value as Record<string, unknown>;
  const playlists = Array.isArray(raw.playlists)
    ? raw.playlists.map((p: unknown) => {
        if (!p || typeof p !== "object") return null;
        const pl = p as Record<string, unknown>;
        const name = typeof pl.name === "string" ? pl.name : "Custom";
        const url = typeof pl.url === "string" ? pl.url : "";
        if (!url) return null;
        return {
          name,
          url,
          epgUrl: typeof pl.epgUrl === "string" ? pl.epgUrl : undefined,
          autoRefreshMinutes:
            typeof pl.autoRefreshMinutes === "number"
              ? pl.autoRefreshMinutes
              : undefined,
        };
      }).filter((p): p is NonNullable<typeof p> => p !== null)
    : DEFAULT_CONFIG.playlists;

  return {
    playlists: playlists.length > 0 ? playlists : DEFAULT_CONFIG.playlists,
    defaultDevice: typeof raw.defaultDevice === "string" ? raw.defaultDevice : undefined,
    appId: typeof raw.appId === "string" ? raw.appId : undefined,
  };
}

export const iptvConfigSchema = {
  parse: parseIptvConfig,
  uiHints: {
    "playlists": { label: "Playlist Sources" },
    "defaultDevice": { label: "Default webOS Device", help: "ares device name for deploy" },
    "appId": { label: "App ID Override", advanced: true },
  },
};
