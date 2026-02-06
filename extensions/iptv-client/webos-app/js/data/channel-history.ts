import { storageGet, storageSet } from "../storage.js";

const STORAGE_KEY = "channel_history";
const MAX_HISTORY = 20;

type HistoryEntry = {
  url: string;
  timestamp: number;
};

let history: HistoryEntry[] = [];

/** Load channel history from localStorage. */
export function loadHistory(): HistoryEntry[] {
  history = storageGet<HistoryEntry[]>(STORAGE_KEY, []);
  return history;
}

/** Record a channel view. Dedupes and keeps most recent at front. */
export function recordChannel(url: string): void {
  // Remove existing entry for this URL
  history = history.filter((h) => h.url !== url);
  // Add to front
  history.unshift({ url, timestamp: Date.now() });
  // Trim to max
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }
  storageSet(STORAGE_KEY, history);
}

/** Get the last watched channel URL. */
export function getLastChannel(): string | undefined {
  return history[0]?.url;
}

/** Get the previous channel (for "Back" button behavior). */
export function getPreviousChannel(): string | undefined {
  return history[1]?.url;
}

/** Get recently watched channel URLs. */
export function getRecentUrls(): string[] {
  return history.map((h) => h.url);
}
