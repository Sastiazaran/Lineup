import { StorageKey } from "@/lib/constants";
import { cleanFavorites, type Favorite } from "@/lib/favorites";
import { cleanSpreadPrefs, type SpreadPrefs } from "@/lib/spread-prefs";

export function readGuestFavorites(): Favorite[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(StorageKey.GuestFavorites);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as { sportKey?: string; teamName?: string }[];
    return cleanFavorites(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export function writeGuestFavorites(favorites: Favorite[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(StorageKey.GuestFavorites, JSON.stringify(cleanFavorites(favorites)));
}

export function clearGuestFavorites(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(StorageKey.GuestFavorites);
}

export function readGuestSpreads(): SpreadPrefs {
  if (typeof window === "undefined") {
    return cleanSpreadPrefs(undefined);
  }
  try {
    const raw = window.localStorage.getItem(StorageKey.GuestSpreads);
    if (!raw) {
      return cleanSpreadPrefs(undefined);
    }
    const parsed = JSON.parse(raw) as Record<string, boolean | undefined>;
    return cleanSpreadPrefs(parsed && typeof parsed === "object" ? parsed : undefined);
  } catch {
    return cleanSpreadPrefs(undefined);
  }
}

export function writeGuestSpreads(prefs: SpreadPrefs): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(StorageKey.GuestSpreads, JSON.stringify(cleanSpreadPrefs(prefs)));
}

export function clearGuestSpreads(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(StorageKey.GuestSpreads);
}
