import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { leagueSpreadPrefs, users } from "@/lib/db/schema";
import {
  cleanSpreadPrefs,
  marketsForLeague,
  type SpreadPrefs,
} from "@/lib/spread-prefs";

/**
 * Spreads preference for one user. Leagues with no row stay on.
 * @param userId Subscriber id
 */
export async function listUserSpreadPrefs(userId: string): Promise<SpreadPrefs> {
  const rows = await getDb()
    .select()
    .from(leagueSpreadPrefs)
    .where(eq(leagueSpreadPrefs.userId, userId));
  const stored: Record<string, boolean> = {};
  for (const row of rows) {
    stored[row.sportKey] = row.spreadsEnabled;
  }
  return cleanSpreadPrefs(stored);
}

/**
 * Replaces one user's spread toggles. Only opt-outs are stored; spreads-on is the absence of a row.
 * @param userId Subscriber id
 * @param prefs Full catalog map (unknown keys already dropped)
 */
export async function replaceUserSpreadPrefs(userId: string, prefs: SpreadPrefs): Promise<void> {
  const db = getDb();
  await db.delete(leagueSpreadPrefs).where(eq(leagueSpreadPrefs.userId, userId));
  const optedOut = Object.entries(prefs).filter(([, enabled]) => !enabled);
  if (optedOut.length === 0) {
    return;
  }
  await db.insert(leagueSpreadPrefs).values(
    optedOut.map(([sportKey]) => ({
      userId,
      sportKey,
      spreadsEnabled: false,
    })),
  );
}

/**
 * Markets to request for each sport on the shared daily refresh.
 * A league includes spreads when any still-subscribed user wants them.
 * @param sportKeys Catalog sport keys in fetch order
 */
export async function marketsBySportForRefresh(sportKeys: string[]): Promise<Map<string, string>> {
  if (sportKeys.length === 0) {
    return new Map();
  }

  const db = getDb();
  const subscribers = await db
    .select({ id: users.id })
    .from(users)
    .where(isNull(users.unsubscribedAt));
  const subscriberIds = subscribers.map((row) => row.id);

  const optedOutRows =
    subscriberIds.length === 0
      ? []
      : await db
          .select({
            userId: leagueSpreadPrefs.userId,
            sportKey: leagueSpreadPrefs.sportKey,
          })
          .from(leagueSpreadPrefs)
          .where(
            and(
              inArray(leagueSpreadPrefs.userId, subscriberIds),
              eq(leagueSpreadPrefs.spreadsEnabled, false),
              inArray(leagueSpreadPrefs.sportKey, sportKeys),
            ),
          );

  const optedOutBySport = new Map<string, string[]>();
  for (const row of optedOutRows) {
    const list = optedOutBySport.get(row.sportKey) ?? [];
    list.push(row.userId);
    optedOutBySport.set(row.sportKey, list);
  }

  return new Map(
    sportKeys.map((sportKey) => [
      sportKey,
      marketsForLeague(subscriberIds, optedOutBySport.get(sportKey) ?? []),
    ]),
  );
}
