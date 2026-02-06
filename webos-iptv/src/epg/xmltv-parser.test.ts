import { describe, expect, it } from "vitest";
import { parseXmltv } from "./xmltv-parser.js";

const SAMPLE_XMLTV = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="test">
  <channel id="aajtak.in">
    <display-name>Aaj Tak</display-name>
    <icon src="https://example.com/aajtak.png" />
  </channel>
  <channel id="starsports1.in">
    <display-name>Star Sports 1</display-name>
  </channel>
  <programme start="20250115100000 +0530" stop="20250115110000 +0530" channel="aajtak.in">
    <title lang="en">Morning News</title>
    <desc>Daily morning news bulletin</desc>
    <category>News</category>
    <icon src="https://example.com/news.png" />
  </programme>
  <programme start="20250115110000 +0530" stop="20250115120000 +0530" channel="aajtak.in">
    <title lang="en">Breaking News</title>
    <desc>Live breaking news coverage</desc>
    <category>News</category>
  </programme>
  <programme start="20250115130000 +0530" stop="20250115160000 +0530" channel="starsports1.in">
    <title lang="en">IPL Live</title>
    <desc>Indian Premier League live cricket</desc>
    <category>Sports</category>
  </programme>
</tv>`;

describe("XMLTV parser", () => {
  it("parses channels", () => {
    const result = parseXmltv(SAMPLE_XMLTV);
    expect(result.channels).toHaveLength(2);
    expect(result.channels[0].id).toBe("aajtak.in");
    expect(result.channels[0].displayName).toBe("Aaj Tak");
    expect(result.channels[0].icon).toBe("https://example.com/aajtak.png");
  });

  it("parses channel without icon", () => {
    const result = parseXmltv(SAMPLE_XMLTV);
    expect(result.channels[1].id).toBe("starsports1.in");
    expect(result.channels[1].icon).toBeUndefined();
  });

  it("parses programmes", () => {
    const result = parseXmltv(SAMPLE_XMLTV);
    expect(result.programmes).toHaveLength(3);
  });

  it("parses programme fields correctly", () => {
    const result = parseXmltv(SAMPLE_XMLTV);
    const prog = result.programmes[0];
    expect(prog.channelId).toBe("aajtak.in");
    expect(prog.title).toBe("Morning News");
    expect(prog.description).toBe("Daily morning news bulletin");
    expect(prog.category).toBe("News");
    expect(prog.icon).toBe("https://example.com/news.png");
  });

  it("parses XMLTV dates with timezone offset", () => {
    const result = parseXmltv(SAMPLE_XMLTV);
    const prog = result.programmes[0];
    // 10:00 IST (+0530) = 04:30 UTC
    expect(prog.start.getUTCHours()).toBe(4);
    expect(prog.start.getUTCMinutes()).toBe(30);
    expect(prog.stop.getUTCHours()).toBe(5);
    expect(prog.stop.getUTCMinutes()).toBe(30);
  });

  it("handles empty XML", () => {
    const result = parseXmltv(
      '<?xml version="1.0"?><tv></tv>',
    );
    expect(result.channels).toHaveLength(0);
    expect(result.programmes).toHaveLength(0);
  });

  it("skips programmes without required attributes", () => {
    const xml = `<?xml version="1.0"?>
<tv>
  <programme channel="test.in">
    <title>No times</title>
  </programme>
</tv>`;
    const result = parseXmltv(xml);
    expect(result.programmes).toHaveLength(0);
  });
});
