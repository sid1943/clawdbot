import type { EpgChannel, EpgData, EpgProgramme } from "./types.js";

/**
 * Parse an XMLTV date string like "20250115120000 +0530" into a Date.
 * Format: YYYYMMDDHHmmss [+/-]HHMM
 */
function parseXmltvDate(str: string): Date {
  const clean = str.trim();
  const year = Number.parseInt(clean.slice(0, 4), 10);
  const month = Number.parseInt(clean.slice(4, 6), 10) - 1;
  const day = Number.parseInt(clean.slice(6, 8), 10);
  const hour = Number.parseInt(clean.slice(8, 10), 10);
  const minute = Number.parseInt(clean.slice(10, 12), 10);
  const second = Number.parseInt(clean.slice(12, 14), 10);

  const tzMatch = clean.match(/([+-])(\d{2})(\d{2})$/);
  if (tzMatch) {
    const sign = tzMatch[1] === "+" ? 1 : -1;
    const tzHours = Number.parseInt(tzMatch[2], 10);
    const tzMinutes = Number.parseInt(tzMatch[3], 10);
    const offsetMs = sign * (tzHours * 60 + tzMinutes) * 60_000;
    const utcMs = Date.UTC(year, month, day, hour, minute, second) - offsetMs;
    return new Date(utcMs);
  }

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/** Extract an XML attribute value by name from a tag string. */
function getAttr(tag: string, name: string): string | undefined {
  const re = new RegExp(`${name}="([^"]*)"`, "i");
  const m = tag.match(re);
  return m ? m[1] : undefined;
}

/** Extract text content of the first matching child element via regex. */
function getChildText(block: string, tagName: string): string | undefined {
  const re = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() || undefined : undefined;
}

/** Extract icon src from a child <icon> element. */
function getChildIcon(block: string): string | undefined {
  const m = block.match(/<icon[^>]*src="([^"]*)"[^>]*\/?>/i);
  return m ? m[1] : undefined;
}

/**
 * Parse XMLTV XML string into structured EPG data.
 * Uses regex-based parsing to work in both Node.js and browser environments.
 */
export function parseXmltv(xml: string): EpgData {
  const channels: EpgChannel[] = [];
  const programmes: EpgProgramme[] = [];

  // Parse <channel> elements
  const channelRe = /<channel\s([^>]*)>([\s\S]*?)<\/channel>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = channelRe.exec(xml)) !== null) {
    const attrs = cm[1];
    const body = cm[2];
    const id = getAttr(attrs, "id");
    if (!id) continue;

    channels.push({
      id,
      displayName: getChildText(body, "display-name") || id,
      icon: getChildIcon(body),
    });
  }

  // Parse <programme> elements
  const progRe = /<programme\s([^>]*)>([\s\S]*?)<\/programme>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = progRe.exec(xml)) !== null) {
    const attrs = pm[1];
    const body = pm[2];

    const channelId = getAttr(attrs, "channel");
    const startStr = getAttr(attrs, "start");
    const stopStr = getAttr(attrs, "stop");
    if (!channelId || !startStr || !stopStr) continue;

    programmes.push({
      channelId,
      title: getChildText(body, "title") || "Untitled",
      description: getChildText(body, "desc"),
      start: parseXmltvDate(startStr),
      stop: parseXmltvDate(stopStr),
      category: getChildText(body, "category"),
      icon: getChildIcon(body),
    });
  }

  return { channels, programmes };
}
