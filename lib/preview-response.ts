import { OddsMessage, SPORTS } from "@/lib/constants";
import { isOddsQuotaExhausted, listOddsSnapshots } from "@/lib/odds-snapshot";
import { buildDigest, type FavoriteTeam } from "@/lib/recommend";
import { TEAM_ROSTERS, mergeTeamList } from "@/lib/teams";

export type PreviewPayload = {
  error?: string;
  digest: ReturnType<typeof serializeDigest>;
  teams: Record<string, string[]>;
};

/**
 * Builds the dashboard payload from the daily odds snapshot. Does not call The Odds API.
 * @param userFavorites Saved or guest team picks
 */
export async function buildPreviewResponse(userFavorites: FavoriteTeam[]): Promise<PreviewPayload> {
  const catalogKeys = SPORTS.map((sport) => sport.key);
  let events: Awaited<ReturnType<typeof listOddsSnapshots>>[number]["events"] = [];
  let oddsError: string | undefined;
  try {
    const rows = await listOddsSnapshots(catalogKeys);
    events = rows.flatMap((row) => row.events);
    if (await isOddsQuotaExhausted()) {
      oddsError = OddsMessage.QuotaPaused;
    } else if (events.length === 0) {
      oddsError = OddsMessage.SnapshotEmpty;
    }
  } catch (error) {
    oddsError = error instanceof Error ? error.message : OddsMessage.SnapshotEmpty;
  }

  const digest = buildDigest(events, userFavorites);
  return {
    error: oddsError,
    digest: serializeDigest(digest),
    teams: rosterPayload(events),
  };
}

function rosterPayload(events: { sport_key: string; home_team: string; away_team: string }[]) {
  return Object.fromEntries(
    SPORTS.map((sport) => {
      const live = events
        .filter((event) => event.sport_key === sport.key)
        .flatMap((event) => [event.home_team, event.away_team]);
      return [sport.key, mergeTeamList([...TEAM_ROSTERS[sport.key]], live)];
    }),
  );
}

function serializeDigest(digest: ReturnType<typeof buildDigest>) {
  return {
    recommendation: digest.recommendation
      ? {
          teamName: digest.recommendation.teamName,
          sportKey: digest.recommendation.event.sport_key,
          sportTitle: digest.recommendation.event.sport_title,
          homeTeam: digest.recommendation.event.home_team,
          awayTeam: digest.recommendation.event.away_team,
          commenceTime: digest.recommendation.event.commence_time,
          moneyline: digest.recommendation.moneyline,
          spread: digest.recommendation.spread,
        }
      : null,
    parlay: digest.parlay,
    games: digest.games.map((game) => ({
      sportKey: game.event.sport_key,
      sportTitle: game.event.sport_title,
      homeTeam: game.event.home_team,
      awayTeam: game.event.away_team,
      commenceTime: game.event.commence_time,
      lines: game.lines,
      spreads: game.spreads,
      winProbabilities: game.winProbabilities,
    })),
  };
}
