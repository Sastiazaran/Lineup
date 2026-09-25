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

export type CreditsPerCall = number | ((sportKey: string) => number);

function creditCost(creditsPerCall: CreditsPerCall, sportKey: string): number {
  return typeof creditsPerCall === "function" ? creditsPerCall(sportKey) : creditsPerCall;
}

/**
 * Walks sports sequentially so a quota 401 can stop further live calls.
 * The first sport is always attempted (to detect a monthly reset). Remaining sports
 * (and a failing sport) are filled from the last-good snapshot.
 * A sport is skipped when remaining credits cannot cover that sport's own cost.
 * Quota is marked exhausted when nothing later in the list is affordable either.
 * @param sportKeys Distinct Odds API sport keys to cover
 * @param fetchSport Live `/odds` call for one sport
 * @param loadSnapshot Last persisted events for a sport (empty if none)
 * @param creditsPerCall Cost of the next live call, or a per-sport cost (1 for moneyline, 2 with spreads)
 */
export async function collectSportOdds(options: {
  sportKeys: string[];
  fetchSport: (sportKey: string) => Promise<FetchedSportOdds>;
  loadSnapshot: (sportKey: string) => Promise<OddsEvent[]>;
  creditsPerCall: CreditsPerCall;
}): Promise<OddsRefreshResult> {
  const unique = [...new Set(options.sportKeys)];
  const events: OddsEvent[] = [];
  const fetchedKeys: string[] = [];
  const snapshotKeys: string[] = [];
  let remaining: number | null = null;
  let quotaExhausted = false;
  let attemptedLive = false;

  for (let index = 0; index < unique.length; index += 1) {
    const sportKey = unique[index] ?? "";
    const cost = creditCost(options.creditsPerCall, sportKey);
    const cannotAfford = remaining !== null && remaining < cost;

    if (attemptedLive && quotaExhausted) {
      events.push(...(await options.loadSnapshot(sportKey)));
      snapshotKeys.push(sportKey);
      continue;
    }

    if (attemptedLive && cannotAfford) {
      events.push(...(await options.loadSnapshot(sportKey)));
      snapshotKeys.push(sportKey);
      const laterFits = unique
        .slice(index + 1)
        .some((laterKey) => remaining !== null && remaining >= creditCost(options.creditsPerCall, laterKey));
      if (!laterFits) {
        quotaExhausted = true;
      }
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
