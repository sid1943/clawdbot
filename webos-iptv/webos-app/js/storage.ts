/** localStorage wrapper with JSON serialization and TTL support. */

const PREFIX = "clawdbot_iptv_";

export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function storageSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full — silently fail
  }
}

export function storageRemove(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

/** Get a value with TTL check. Returns fallback if expired. */
export function storageGetWithTtl<T>(key: string, fallback: T): T {
  const entry = storageGet<{ value: T; expiresAt: number } | null>(
    key + "_ttl",
    null,
  );
  if (!entry || Date.now() > entry.expiresAt) return fallback;
  return entry.value;
}

/** Set a value with TTL in minutes. */
export function storageSetWithTtl<T>(
  key: string,
  value: T,
  ttlMinutes: number,
): void {
  storageSet(key + "_ttl", {
    value,
    expiresAt: Date.now() + ttlMinutes * 60_000,
  });
}
