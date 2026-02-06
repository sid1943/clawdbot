import { storageGet, storageSet } from "../storage.js";

const STORAGE_KEY = "favorites";

let favorites: Set<string> = new Set();

/** Load favorites from localStorage. */
export function loadFavorites(): Set<string> {
  const stored = storageGet<string[]>(STORAGE_KEY, []);
  favorites = new Set(stored);
  return favorites;
}

/** Save favorites to localStorage. */
function saveFavorites(): void {
  storageSet(STORAGE_KEY, [...favorites]);
}

/** Toggle a channel URL as favorite. Returns new favorite state. */
export function toggleFavorite(url: string): boolean {
  if (favorites.has(url)) {
    favorites.delete(url);
    saveFavorites();
    return false;
  }
  favorites.add(url);
  saveFavorites();
  return true;
}

/** Check if a URL is favorited. */
export function isFavorite(url: string): boolean {
  return favorites.has(url);
}

/** Get the current favorites set. */
export function getFavorites(): Set<string> {
  return favorites;
}
