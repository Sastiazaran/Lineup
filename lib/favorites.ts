import { SPORTS } from "@/lib/constants";

export type Favorite = { sportKey: string; teamName: string };

const allowedSports = new Set<string>(SPORTS.map((sport) => sport.key));

/**
 * Normalizes and deduplicates favorite rows; drops unknown sport keys.
 */
export function cleanFavorites(
  incoming: { sportKey?: string; teamName?: string }[] | undefined,
): Favorite[] {
  const cleaned = (incoming ?? [])
    .map((item) => ({
      sportKey: item.sportKey?.trim() ?? "",
      teamName: item.teamName?.trim() ?? "",
    }))
    .filter((item) => item.sportKey && item.teamName && allowedSports.has(item.sportKey));

  return [...new Map(cleaned.map((item) => [`${item.sportKey}:${item.teamName}`, item])).values()];
}
