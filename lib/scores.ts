import { EnvKey, OddsApi } from "@/lib/constants";
import { requireEnv } from "@/lib/env";
import {
  OddsApiRequestError,
  parseOddsErrorCode,
  parseOddsUsage,
  type OddsUsage,
} from "@/lib/odds";
import type { ScoreEvent } from "@/lib/picks";

export type SportScoresResult = {
  events: ScoreEvent[];
  usage: OddsUsage;
};

/**
 * Credits charged for one `/scores` call that includes `daysFrom` (completed games).
 */
export function scoresCreditsPerCall(): number {
  return OddsApi.ScoresCredits;
}

/**
 * Fetches live and recently completed scores for one sport. `daysFrom` is required
 * to settle finished games and costs 2 credits. Optional `eventIds` only shrinks
 * the payload; it does not change the credit cost.
 * @param sportKey The Odds API sport key, e.g. `soccer_epl`
 * @param eventIds Pending pick event ids to filter the response
 * @throws {OddsApiRequestError} When the HTTP response is not OK
 */
export async function fetchSportScores(
  sportKey: string,
  eventIds: string[] = [],
): Promise<SportScoresResult> {
  const apiKey = requireEnv(EnvKey.OddsApiKey);
  const url = new URL(`${OddsApi.BaseUrl}/sports/${sportKey}/scores`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("daysFrom", String(OddsApi.ScoresDaysFrom));
  if (eventIds.length > 0) {
    url.searchParams.set("eventIds", eventIds.join(","));
  }

  const response = await fetch(url, { cache: "no-store" });
  const usage = parseOddsUsage(response.headers);

  if (!response.ok) {
    const detail = await response.text();
    throw new OddsApiRequestError(
      sportKey,
      response.status,
      detail,
      parseOddsErrorCode(detail),
      usage,
    );
  }

  return {
    events: (await response.json()) as ScoreEvent[],
    usage,
  };
}
