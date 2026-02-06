import { describe, expect, it } from "vitest";
import { parseM3u } from "./parser.js";

const SAMPLE_M3U = `#EXTM3U x-tvg-url="http://epg.example.com/guide.xml"
#EXTINF:-1 tvg-id="aajtak.in" tvg-name="Aaj Tak" tvg-logo="https://example.com/aajtak.png" group-title="News",Aaj Tak HD
http://stream.example.com/aajtak/index.m3u8
#EXTINF:-1 tvg-id="starsports1.in" tvg-name="Star Sports 1" tvg-logo="https://example.com/ss1.png" group-title="Sports",Star Sports 1 HD
http://stream.example.com/starsports1/index.m3u8
#EXTINF:-1 tvg-id="setindia.in" tvg-name="SET India" tvg-logo="https://example.com/set.png" group-title="Entertainment",SET India HD
http://stream.example.com/setindia/index.m3u8
#EXTINF:-1 tvg-id="espn.us" tvg-name="ESPN" tvg-logo="https://example.com/espn.png" group-title="Sports",ESPN
http://stream.example.com/espn/index.m3u8
`;

describe("M3U parser", () => {
  it("parses channels from M3U content", () => {
    const result = parseM3u(SAMPLE_M3U);
    expect(result.channels).toHaveLength(4);
  });

  it("extracts channel names correctly", () => {
    const result = parseM3u(SAMPLE_M3U);
    expect(result.channels[0].name).toBe("Aaj Tak HD");
    expect(result.channels[1].name).toBe("Star Sports 1 HD");
    expect(result.channels[3].name).toBe("ESPN");
  });

  it("extracts tvg attributes", () => {
    const result = parseM3u(SAMPLE_M3U);
    const ch = result.channels[0];
    expect(ch.tvgId).toBe("aajtak.in");
    expect(ch.tvgName).toBe("Aaj Tak");
    expect(ch.logo).toBe("https://example.com/aajtak.png");
    expect(ch.group).toBe("News");
  });

  it("collects unique groups sorted alphabetically", () => {
    const result = parseM3u(SAMPLE_M3U);
    expect(result.groups).toEqual(["Entertainment", "News", "Sports"]);
  });

  it("parses playlist-level attributes from #EXTM3U", () => {
    const result = parseM3u(SAMPLE_M3U);
    expect(result.attributes["x-tvg-url"]).toBe(
      "http://epg.example.com/guide.xml",
    );
  });

  it("assigns 1-based index to each channel", () => {
    const result = parseM3u(SAMPLE_M3U);
    expect(result.channels[0].index).toBe(1);
    expect(result.channels[3].index).toBe(4);
  });

  it("extracts stream URLs", () => {
    const result = parseM3u(SAMPLE_M3U);
    expect(result.channels[0].url).toBe(
      "http://stream.example.com/aajtak/index.m3u8",
    );
  });

  it("handles empty content", () => {
    const result = parseM3u("");
    expect(result.channels).toHaveLength(0);
    expect(result.groups).toHaveLength(0);
  });

  it("handles EXTM3U only", () => {
    const result = parseM3u("#EXTM3U");
    expect(result.channels).toHaveLength(0);
  });

  it("skips non-URL lines", () => {
    const m3u = `#EXTM3U
#EXTINF:-1,Test
not-a-url
#EXTINF:-1,Valid
http://example.com/stream.ts
`;
    const result = parseM3u(m3u);
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].name).toBe("Valid");
  });

  it("handles URLs without preceding EXTINF", () => {
    const m3u = `#EXTM3U
http://example.com/stream1.ts
http://example.com/stream2.ts
`;
    const result = parseM3u(m3u);
    expect(result.channels).toHaveLength(2);
    expect(result.channels[0].name).toBe("Channel 1");
    expect(result.channels[1].name).toBe("Channel 2");
  });

  it("handles Windows-style line endings", () => {
    const m3u =
      "#EXTM3U\r\n#EXTINF:-1,Test\r\nhttp://example.com/stream.ts\r\n";
    const result = parseM3u(m3u);
    expect(result.channels).toHaveLength(1);
  });

  it("supports rtsp and rtmp URLs", () => {
    const m3u = `#EXTM3U
#EXTINF:-1,RTSP Stream
rtsp://example.com/live
#EXTINF:-1,RTMP Stream
rtmp://example.com/live
`;
    const result = parseM3u(m3u);
    expect(result.channels).toHaveLength(2);
  });
});
