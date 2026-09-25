import { MarketKey, OddsApi, SPORTS } from "@/lib/constants";

/** sportKey → whether the daily refresh should include spreads for that user. */
export type SpreadPrefs = Record<string, boolean>;

const allowedSports = new Set<string>(SPORTS.map((sport) => sport.key));

/**
 * Spreads on for every catalog league. This is the stored default: no row means on.
 */
export function defaultSpreadPrefs(): SpreadPrefs {
  return Object.fromEntries(SPORTS.map((sport) => [sport.key, true]));
}

/**
 * Fills missing leagues with spreads on and drops unknown sport keys.
 * Non-boolean values are ignored so a partial payload cannot turn a league off by accident.
 * @param incoming Partial map from the client or from stored rows
 */
export function cleanSpreadPrefs(
  incoming: Record<string, boolean | undefined> | undefined,
): SpreadPrefs {
  const prefs = defaultSpreadPrefs();
  if (!incoming) {
    return prefs;
  }
  for (const [sportKey, enabled] of Object.entries(incoming)) {
    if (allowedSports.has(sportKey) && typeof enabled === "boolean") {
      prefs[sportKey] = enabled;
    }
  }
  return prefs;
}

/**
 * Odds API `markets` query for one league.
 * @param spreadsEnabled When false, only the moneyline (`h2h`) is requested
 */
export function marketsForSpreads(spreadsEnabled: boolean): string {
  return spreadsEnabled ? OddsApi.Markets : MarketKey.H2h;
}

/**
 * True when the shared snapshot should include spreads for one league.
 * Spreads are included only when at least one subscribed user wants them.
 * Subscribers with no stored opt-out want spreads. An empty subscriber list
 * includes nobody, so the league is moneyline-only.
 * @param subscriberIds Users who still receive the digest
 * @param optedOutUserIds Subscribers who turned spreads off for this league
 */
export function leagueWantsSpreads(
  subscriberIds: readonly string[],
  optedOutUserIds: readonly string[],
): boolean {
  if (subscriberIds.length === 0) {
    return false;
  }
  const optedOut = new Set(optedOutUserIds);
  return subscriberIds.some((userId) => !optedOut.has(userId));
}

/**
 * Markets string for one league given who is subscribed and who opted out.
 */
export function marketsForLeague(
  subscriberIds: readonly string[],
  optedOutUserIds: readonly string[],
): string {
  return marketsForSpreads(leagueWantsSpreads(subscriberIds, optedOutUserIds));
}
