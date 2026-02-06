/** IPTV client app configuration. */

export type IptvConfig = {
  playlists: Array<{
    name: string;
    url: string;
    epgUrl?: string;
    autoRefreshMinutes?: number;
  }>;
  defaultDevice?: string;
  appId?: string;
};

export const DEFAULT_CONFIG: IptvConfig = {
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
