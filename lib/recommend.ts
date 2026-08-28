import { TimeWindow } from "@/lib/constants";
import { roundSpread } from "@/lib/formatting";
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

export type WinOutcome = {
  name: string;
  probability: number;
  decimalOdds: number;
};

export type WinProbabilities = {
  home: WinOutcome;
  away: WinOutcome;
  draw?: WinOutcome;
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
  winProbabilities: WinProbabilities;
};

export type ParlayLeg = {
  teamName: string;
  opponent: string;
  sportTitle: string;
  commenceTime: string;
  winProbability: number;
  decimalOdds: number;
};

export type ParlaySuggestion = {
  legs: ParlayLeg[];
  combinedProbability: number;
  combinedDecimalOdds: number;
  explanation: string;
};

export type DigestContent = {
  recommendation: RecommendedBet | null;
  games: GamePreview[];
  parlay: ParlaySuggestion | null;
};

const ParlayMinLegs = 2;
const ParlayMaxLegs = 3;
const ParlaySweetSpotMin = 0.1;
const ParlaySweetSpotMax = 0.45;

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
 * Normalizes raw implied probabilities so they sum to 1 (removes bookmaker margin).
 */
export function normalizeWinProbabilities(
  lines: ConsensusLine[],
  homeTeam: string,
  awayTeam: string,
): WinProbabilities | null {
  const home = lines.find((line) => line.name === homeTeam);
  const away = lines.find((line) => line.name === awayTeam);
  if (!home || !away) {
    return null;
  }

  const draw = lines.find((line) => line.name.toLowerCase() === "draw");
  const raw = [
    { key: "home" as const, line: home },
    { key: "away" as const, line: away },
    ...(draw ? [{ key: "draw" as const, line: draw }] : []),
  ];
  const total = raw.reduce((sum, item) => sum + item.line.impliedProbability, 0);
  if (total <= 0) {
    return null;
  }

  const toOutcome = (line: ConsensusLine): WinOutcome => ({
    name: line.name,
    probability: line.impliedProbability / total,
    decimalOdds: line.decimalOdds,
  });

  return {
    home: toOutcome(home),
    away: toOutcome(away),
    ...(draw ? { draw: toOutcome(draw) } : {}),
  };
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
      line.point = roundSpread(average(bucket.points));
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

function opponentOf(event: OddsEvent, teamName: string): string {
  return teamName === event.home_team ? event.away_team : event.home_team;
}

function winOutcomeForTeam(
  probabilities: WinProbabilities,
  event: OddsEvent,
  teamName: string,
): WinOutcome | null {
  if (teamsMatch(teamName, event.home_team)) {
    return probabilities.home;
  }
  if (teamsMatch(teamName, event.away_team)) {
    return probabilities.away;
  }
  return null;
}

/**
 * Picks 2–3 favorite-team legs with the best combined win chance in a reasonable range.
 */
export function buildParlaySuggestion(
  games: GamePreview[],
  favorites: FavoriteTeam[],
): ParlaySuggestion | null {
  const legs: ParlayLeg[] = [];

  for (const game of games) {
    const favoriteTeams = favorites.filter(
      (favorite) =>
        favorite.sportKey === game.event.sport_key &&
        (teamsMatch(favorite.teamName, game.event.home_team) ||
          teamsMatch(favorite.teamName, game.event.away_team)),
    );
    if (favoriteTeams.length === 0) {
      continue;
    }

    let best: ParlayLeg | null = null;
    for (const favorite of favoriteTeams) {
      const outcome = winOutcomeForTeam(game.winProbabilities, game.event, favorite.teamName);
      if (!outcome) {
        continue;
      }
      const leg: ParlayLeg = {
        teamName: outcome.name,
        opponent: opponentOf(game.event, outcome.name),
        sportTitle: game.event.sport_title,
        commenceTime: game.event.commence_time,
        winProbability: outcome.probability,
        decimalOdds: outcome.decimalOdds,
      };
      if (!best || leg.winProbability > best.winProbability) {
        best = leg;
      }
    }
    if (best) {
      legs.push(best);
    }
  }

  if (legs.length < ParlayMinLegs) {
    return null;
  }

  legs.sort((a, b) => b.winProbability - a.winProbability);

  let bestParlay: ParlaySuggestion | null = null;
  let bestScore = -1;

  for (let size = ParlayMinLegs; size <= Math.min(ParlayMaxLegs, legs.length); size += 1) {
    const combo = legs.slice(0, size);
    const combinedProbability = combo.reduce((product, leg) => product * leg.winProbability, 1);
    const combinedDecimalOdds = combo.reduce((product, leg) => product * leg.decimalOdds, 1);
    const inSweetSpot =
      combinedProbability >= ParlaySweetSpotMin && combinedProbability <= ParlaySweetSpotMax;
    const score = inSweetSpot
      ? combinedProbability + 0.5
      : combinedProbability * (combinedProbability < ParlaySweetSpotMin ? 0.5 : 0.75);

    if (score > bestScore) {
      bestScore = score;
      bestParlay = {
        legs: combo,
        combinedProbability,
        combinedDecimalOdds,
        explanation: parlayExplanation(combo, combinedProbability),
      };
    }
  }

  return bestParlay;
}

function parlayExplanation(legs: ParlayLeg[], combinedProbability: number): string {
  const legSummaries = legs
    .map((leg) => `${leg.teamName} (${Math.round(leg.winProbability * 100)}%)`)
    .join(", ");
  const combinedPct = Math.round(combinedProbability * 100);
  return `These are your strongest favorites this window — ${legSummaries} — with a combined win chance of about ${combinedPct}%. All legs need to hit for the parlay to cash.`;
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

  const games: GamePreview[] = upcoming.map((event) => {
    const lines = consensusByName(listH2hOutcomes(event));
    return {
      event,
      lines,
      spreads: consensusByName(listSpreadOutcomes(event)),
      winProbabilities:
        normalizeWinProbabilities(lines, event.home_team, event.away_team) ?? {
          home: { name: event.home_team, probability: 0, decimalOdds: 0 },
          away: { name: event.away_team, probability: 0, decimalOdds: 0 },
        },
    };
  });

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
    parlay: buildParlaySuggestion(games, favorites),
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
