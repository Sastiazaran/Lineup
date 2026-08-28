import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { SPORTS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { fetchOddsForSports } from "@/lib/odds";
import { buildDigest, type FavoriteTeam } from "@/lib/recommend";
import { TEAM_ROSTERS, mergeTeamList } from "@/lib/teams";

/**
 * Upcoming favorite games plus merged team lists for the picker.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getDb()
    .select()
    .from(favorites)
    .where(eq(favorites.userId, session.userId));
  const userFavorites: FavoriteTeam[] = rows.map((row) => ({
    sportKey: row.sportKey,
    teamName: row.teamName,
  }));

  const sportKeys = [...new Set(userFavorites.map((item) => item.sportKey))];
  let events: Awaited<ReturnType<typeof fetchOddsForSports>> = [];
  let oddsError: string | undefined;
  try {
    if (sportKeys.length > 0) {
      events = await fetchOddsForSports(sportKeys);
    }
  } catch (error) {
    oddsError = error instanceof Error ? error.message : "Odds unavailable";
  }

  const digest = buildDigest(events, userFavorites);
  return NextResponse.json({
    error: oddsError,
    digest: serializeDigest(digest),
    teams: rosterPayload(events),
  });
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
