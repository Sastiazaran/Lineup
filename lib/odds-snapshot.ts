import { eq, inArray } from "drizzle-orm";
import { OddsQuotaStateId } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { oddsQuotaState, oddsSnapshots } from "@/lib/db/schema";
import {
  OddsApiRequestError,
  fetchSportOdds,
  isOutOfUsageCredits,
  oddsCreditsPerCall,
  type OddsEvent,
  type OddsUsage,
} from "@/lib/odds";
import {
  alreadyFetchedToday,
  collectSportOdds,
  type OddsRefreshResult,
} from "@/lib/odds-refresh";

export type OddsSnapshotRow = {
  sportKey: string;
  events: OddsEvent[];
  fetchedAt: Date;
};

/**
 * Last persisted odds for the given sports. Missing sports are omitted.
 * @param sportKeys Sports to load
 */
export async function listOddsSnapshots(sportKeys: string[]): Promise<OddsSnapshotRow[]> {
  if (sportKeys.length === 0) {
    return [];
  }
  const rows = await getDb()
    .select()
    .from(oddsSnapshots)
    .where(inArray(oddsSnapshots.sportKey, sportKeys));
  return rows.map((row) => ({
    sportKey: row.sportKey,
    events: row.events as OddsEvent[],
    fetchedAt: row.fetchedAt,
  }));
}

/**
 * Whether the last live refresh recorded a spent monthly quota.
 */
export async function isOddsQuotaExhausted(): Promise<boolean> {
  const row = await loadQuotaRow();
  return row?.exhaustedAt != null;
}

/**
 * Live-refreshes sports in order, upserts successes, and fills gaps from snapshots.
 * The only production caller should be the daily digest cron. Skips live calls
 * when a refresh already ran today (UTC).
 * @param sportKeys Sports to refresh
 * @param now Clock for the same-day guard
 */
export async function refreshStoredOdds(
  sportKeys: string[],
  now = new Date(),
): Promise<OddsRefreshResult> {
  const quota = await loadQuotaRow();
  if (alreadyFetchedToday(quota?.lastLiveFetchAt ?? null, now)) {
    const rows = await listOddsSnapshots(sportKeys);
    return {
      events: rows.flatMap((row) => row.events),
      fetchedKeys: [],
      snapshotKeys: sportKeys,
      quotaExhausted: quota?.exhaustedAt != null,
      remaining: quota?.requestsRemaining ?? null,
    };
  }

  const result = await collectSportOdds({
    sportKeys,
    creditsPerCall: oddsCreditsPerCall(),
    fetchSport: async (sportKey) => {
      try {
        const live = await fetchSportOdds(sportKey);
        await upsertSnapshot(sportKey, live.events);
        await upsertQuota(live.usage, live.usage.remaining === 0, now);
        return { events: live.events, remaining: live.usage.remaining };
      } catch (error) {
        if (error instanceof OddsApiRequestError) {
          await upsertQuota(error.usage, isOutOfUsageCredits(error), now);
        }
        throw error;
      }
    },
    loadSnapshot: async (sportKey) => {
      const rows = await listOddsSnapshots([sportKey]);
      return rows[0]?.events ?? [];
    },
  });

  await upsertQuota(
    { remaining: result.remaining, used: null, lastCost: null },
    result.quotaExhausted,
    result.fetchedKeys.length > 0 || result.quotaExhausted ? now : quota?.lastLiveFetchAt ?? null,
  );
  return result;
}

async function upsertSnapshot(sportKey: string, events: OddsEvent[]): Promise<void> {
  const fetchedAt = new Date();
  await getDb()
    .insert(oddsSnapshots)
    .values({ sportKey, events, fetchedAt })
    .onConflictDoUpdate({
      target: oddsSnapshots.sportKey,
      set: { events, fetchedAt },
    });
}

async function upsertQuota(
  usage: OddsUsage,
  quotaExhausted: boolean,
  lastLiveFetchAt: Date | null,
): Promise<void> {
  const existing = await loadQuotaRow();
  const now = new Date();
  const exhaustedAt = quotaExhausted ? (existing?.exhaustedAt ?? now) : null;
  const values = {
    id: OddsQuotaStateId.Global,
    requestsRemaining: usage.remaining ?? existing?.requestsRemaining ?? null,
    requestsUsed: usage.used ?? existing?.requestsUsed ?? null,
    lastCost: usage.lastCost ?? existing?.lastCost ?? null,
    exhaustedAt,
    lastLiveFetchAt: lastLiveFetchAt ?? existing?.lastLiveFetchAt ?? null,
    updatedAt: now,
  };

  await getDb()
    .insert(oddsQuotaState)
    .values(values)
    .onConflictDoUpdate({
      target: oddsQuotaState.id,
      set: {
        requestsRemaining: values.requestsRemaining,
        requestsUsed: values.requestsUsed,
        lastCost: values.lastCost,
        exhaustedAt,
        lastLiveFetchAt: values.lastLiveFetchAt,
        updatedAt: now,
      },
    });
}

async function loadQuotaRow() {
  const rows = await getDb()
    .select()
    .from(oddsQuotaState)
    .where(eq(oddsQuotaState.id, OddsQuotaStateId.Global))
    .limit(1);
  return rows[0] ?? null;
}
