import { TimeWindow } from "@/lib/constants";
import {
  listH2hOutcomes,
  listSpreadOutcomes,
  type OddsEvent,
  type OddsOutcome,
} from "@/lib/odds";
import { teamsMatch } from "@/lib/teams";

export type FavoriteTeam = {
  sportKey: string;
  teamName: string;
};

export type ConsensusLine = {
  name: string;
  decimalOdds: number;
  impliedProbability: number;
  point?: number;
};

export type RecommendedBet = {
  event: OddsEvent;
  teamName: string;
  moneyline: ConsensusLine;
  spread: ConsensusLine | null;
};

export type GamePreview = {
  event: OddsEvent;
  lines: ConsensusLine[];
  spreads: ConsensusLine[];
};

export type DigestContent = {
  recommendation: RecommendedBet | null;
  games: GamePreview[];
};

/**
 * Converts decimal odds to implied probability (0–1), ignoring juice.
 */
export function impliedProbability(decimalOdds: number): number {
  if (decimalOdds <= 0) {
    return 0;
  }
  return 1 / decimalOdds;
}

/**
 * Averages bookmaker prices for each named outcome in a market.
 */
export function consensusByName(outcomes: OddsOutcome[]): ConsensusLine[] {
  const buckets = new Map<string, { prices: number[]; points: number[] }>();

  for (const outcome of outcomes) {
    const bucket = buckets.get(outcome.name) ?? { prices: [], points: [] };
    bucket.prices.push(outcome.price);
    if (typeof outcome.point === "number") {
      bucket.points.push(outcome.point);
    }
    buckets.set(outcome.name, bucket);
  }

  return [...buckets.entries()].map(([name, bucket]) => {
    const decimalOdds = average(bucket.prices);
    const line: ConsensusLine = {
      name,
      decimalOdds,
      impliedProbability: impliedProbability(decimalOdds),
    };
    if (bucket.points.length > 0) {
      line.point = average(bucket.points);
    }
    return line;
  });
}

export function isWithinHours(commenceTime: string, now: Date, hours: number): boolean {
  const start = new Date(commenceTime).getTime();
  const delta = start - now.getTime();
  return delta >= 0 && delta <= hours * 60 * 60 * 1000;
}

export function eventHasFavorite(event: OddsEvent, favorites: FavoriteTeam[]): boolean {
  return favorites.some(
    (favorite) =>
      favorite.sportKey === event.sport_key &&
      (teamsMatch(favorite.teamName, event.home_team) ||
        teamsMatch(favorite.teamName, event.away_team)),
  );
}

/**
 * Favorite-team games that start within the digest window, plus the strongest recommended moneyline.
 *
 * Rule: among consensus moneylines for favorited teams, pick the shortest price
 * (highest implied probability). Attach that team's consensus spread when present.
 */
export function buildDigest(
  events: OddsEvent[],
  favorites: FavoriteTeam[],
  now: Date = new Date(),
  windowHours: number = TimeWindow.DigestHours,
): DigestContent {
  const upcoming = events
    .filter((event) => isWithinHours(event.commence_time, now, windowHours))
    .filter((event) => eventHasFavorite(event, favorites))
    .sort((a, b) => a.commence_time.localeCompare(b.commence_time));

  const games: GamePreview[] = upcoming.map((event) => ({
    event,
    lines: consensusByName(listH2hOutcomes(event)),
    spreads: consensusByName(listSpreadOutcomes(event)),
  }));

  const candidates: RecommendedBet[] = [];
  for (const game of games) {
    const favoriteOutcomes = game.lines.filter((line) =>
      favorites.some(
        (favorite) =>
          favorite.sportKey === game.event.sport_key && teamsMatch(favorite.teamName, line.name),
      ),
    );
    for (const moneyline of favoriteOutcomes) {
      const spread =
        game.spreads.find((line) => teamsMatch(line.name, moneyline.name)) ?? null;
      candidates.push({
        event: game.event,
        teamName: moneyline.name,
        moneyline,
        spread,
      });
    }
  }

  candidates.sort((a, b) => {
    const byProb = b.moneyline.impliedProbability - a.moneyline.impliedProbability;
    if (byProb !== 0) {
      return byProb;
    }
    return a.teamName.localeCompare(b.teamName);
  });

  return {
    recommendation: candidates[0] ?? null,
    games,
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
