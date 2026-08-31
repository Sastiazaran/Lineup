import type { OddsEvent } from "@/lib/odds";
import { isOutOfUsageCredits } from "@/lib/odds";

export type FetchedSportOdds = {
  events: OddsEvent[];
  remaining: number | null;
};

export type OddsRefreshResult = {
  events: OddsEvent[];
  fetchedKeys: string[];
  snapshotKeys: string[];
  quotaExhausted: boolean;
  remaining: number | null;
};

/**
 * True when a live Odds API refresh already ran on this UTC calendar day.
 * Cron retries and extra smoke tests should reuse the snapshot instead of spending credits again.
 * @param lastLiveFetchAt Last HTTP call to `/odds`, or null if never
 * @param now Current time
 */
export function alreadyFetchedToday(lastLiveFetchAt: Date | null, now: Date): boolean {
  if (!lastLiveFetchAt) {
    return false;
  }
  return lastLiveFetchAt.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
}

/**
 * Walks sports sequentially so a quota 401 can stop further live calls.
 * The first sport is always attempted (to detect a monthly reset). Remaining sports
 * (and a failing sport) are filled from the last-good snapshot.
 * @param sportKeys Distinct Odds API sport keys to cover
 * @param fetchSport Live `/odds` call for one sport
 * @param loadSnapshot Last persisted events for a sport (empty if none)
 * @param creditsPerCall Cost of the next live call; used to skip when remaining is too low
 */
export async function collectSportOdds(options: {
  sportKeys: string[];
  fetchSport: (sportKey: string) => Promise<FetchedSportOdds>;
  loadSnapshot: (sportKey: string) => Promise<OddsEvent[]>;
  creditsPerCall: number;
}): Promise<OddsRefreshResult> {
  const unique = [...new Set(options.sportKeys)];
  const events: OddsEvent[] = [];
  const fetchedKeys: string[] = [];
  const snapshotKeys: string[] = [];
  let remaining: number | null = null;
  let quotaExhausted = false;
  let attemptedLive = false;

  for (const sportKey of unique) {
    const cannotAffordNext =
      remaining !== null && remaining < options.creditsPerCall;
    if (attemptedLive && (quotaExhausted || cannotAffordNext)) {
      quotaExhausted = true;
      events.push(...(await options.loadSnapshot(sportKey)));
      snapshotKeys.push(sportKey);
      continue;
    }

    try {
      const live = await options.fetchSport(sportKey);
      attemptedLive = true;
      events.push(...live.events);
      fetchedKeys.push(sportKey);
      remaining = live.remaining;
      if (remaining === 0) {
        quotaExhausted = true;
      }
    } catch (error) {
      attemptedLive = true;
      if (isOutOfUsageCredits(error)) {
        quotaExhausted = true;
        remaining = 0;
      }
      events.push(...(await options.loadSnapshot(sportKey)));
      snapshotKeys.push(sportKey);
    }
  }

  return {
    events,
    fetchedKeys,
    snapshotKeys,
    quotaExhausted,
    remaining,
  };
}
