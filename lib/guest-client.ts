import { StorageKey } from "@/lib/constants";
import { cleanFavorites, type Favorite } from "@/lib/favorites";

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
