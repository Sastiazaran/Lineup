import type { DigestView } from "@/components/insights-panel";
import { SPORTS } from "@/lib/constants";

export type DatePreset = "all" | "today" | "this-week";

export type InsightsFilterState = {
  leagues: string[];
  probabilityMin: number;
  probabilityMax: number;
  spreadMin: number;
  spreadMax: number;
  datePreset: DatePreset;
};

export const DEFAULT_PROBABILITY_MIN = 0;
export const DEFAULT_PROBABILITY_MAX = 100;
export const DEFAULT_SPREAD_MIN = -3;
export const DEFAULT_SPREAD_MAX = 3;

export const INSIGHTS_FILTERS_STORAGE_KEY = "lineup-insights-filters";

export function defaultFilterState(leagues: string[] = []): InsightsFilterState {
  return {
    leagues: [...leagues],
    probabilityMin: DEFAULT_PROBABILITY_MIN,
    probabilityMax: DEFAULT_PROBABILITY_MAX,
    spreadMin: DEFAULT_SPREAD_MIN,
    spreadMax: DEFAULT_SPREAD_MAX,
    datePreset: "all",
  };
}

export function spreadBoundsFromGames(games: DigestView["games"]): { min: number; max: number } {
  const points = games.flatMap((game) =>
    game.spreads
      .map((line) => line.point)
      .filter((point): point is number => typeof point === "number"),
  );

  if (points.length === 0) {
    return { min: DEFAULT_SPREAD_MIN, max: DEFAULT_SPREAD_MAX };
  }

  const min = Math.floor(Math.min(...points));
  const max = Math.ceil(Math.max(...points));
  return {
    min: Math.min(min, DEFAULT_SPREAD_MIN),
    max: Math.max(max, DEFAULT_SPREAD_MAX),
  };
}

export function leaguesFromGames(games: DigestView["games"]): { sportKey: string; sportTitle: string }[] {
  const seen = new Map<string, string>();
  for (const game of games) {
    if (!seen.has(game.sportKey)) {
      seen.set(game.sportKey, game.sportTitle);
    }
  }
  return [...seen.entries()]
    .map(([sportKey, sportTitle]) => ({ sportKey, sportTitle }))
    .sort((a, b) => a.sportTitle.localeCompare(b.sportTitle));
}

/** All configured leagues for the filter UI, preferring live sport titles from the digest when present. */
export function leaguesForFilter(games: DigestView["games"]): { sportKey: string; sportTitle: string }[] {
  const titlesFromGames = new Map(leaguesFromGames(games).map((league) => [league.sportKey, league.sportTitle]));
  return SPORTS.map((sport) => ({
    sportKey: sport.key,
    sportTitle: titlesFromGames.get(sport.key) ?? sport.label,
  })).sort((a, b) => a.sportTitle.localeCompare(b.sportTitle));
}

function gameOutcomeProbabilitiesPercent(game: DigestView["games"][number]): number[] {
  const outcomes = [game.winProbabilities.home, game.winProbabilities.away];
  if (game.winProbabilities.draw) {
    outcomes.push(game.winProbabilities.draw);
  }
  return outcomes.map((outcome) => outcome.probability * 100);
}

function gameSpreadPoints(game: DigestView["games"][number]): number[] {
  return game.spreads
    .map((line) => line.point)
    .filter((point): point is number => typeof point === "number");
}

export function isAllLeaguesSelected(leagues: string[], allLeagues: string[]): boolean {
  return (
    allLeagues.length > 0 &&
    leagues.length === allLeagues.length &&
    allLeagues.every((key) => leagues.includes(key))
  );
}

export function isSomeLeaguesSelected(leagues: string[], allLeagues: string[]): boolean {
  return leagues.length > 0 && leagues.length < allLeagues.length;
}

export function getEffectiveLeagueSelection(leagues: string[], allLeagues: string[]): string[] {
  return isAllLeaguesSelected(leagues, allLeagues) ? allLeagues : leagues;
}

/** Keep league selection valid when the catalog changes; expand to full list when all were selected. */
export function syncLeagueSelection(leagues: string[], allLeagues: string[]): string[] {
  if (leagues.length === 0) {
    return [];
  }
  if (isAllLeaguesSelected(leagues, allLeagues)) {
    return [...allLeagues];
  }
  return leagues.filter((key) => allLeagues.includes(key));
}

export function toggleLeagueInSelection(
  sportKey: string,
  leagues: string[],
  allLeagues: string[],
): string[] {
  const current = getEffectiveLeagueSelection(leagues, allLeagues);
  const next = current.includes(sportKey)
    ? current.filter((key) => key !== sportKey)
    : [...current, sportKey];
  return isAllLeaguesSelected(next, allLeagues) ? [...allLeagues] : next;
}

export function toggleAllLeagues(leagues: string[], allLeagues: string[]): string[] {
  return isAllLeaguesSelected(leagues, allLeagues) ? [] : [...allLeagues];
}

function matchesLeague(game: DigestView["games"][number], leagues: string[]): boolean {
  if (leagues.length === 0) {
    return false;
  }
  return leagues.includes(game.sportKey);
}

function matchesProbability(game: DigestView["games"][number], min: number, max: number): boolean {
  return gameOutcomeProbabilitiesPercent(game).some((value) => value >= min && value <= max);
}

function matchesSpread(game: DigestView["games"][number], min: number, max: number): boolean {
  const points = gameSpreadPoints(game);
  if (points.length === 0) {
    return true;
  }
  return points.some((point) => point >= min && point <= max);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function matchesDate(game: DigestView["games"][number], preset: DatePreset, now = new Date()): boolean {
  if (preset === "all") {
    return true;
  }

  const kickoff = new Date(game.commenceTime);
  if (preset === "today") {
    return kickoff >= startOfLocalDay(now) && kickoff <= endOfLocalDay(now);
  }

  const weekEnd = new Date(startOfLocalDay(now));
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);
  return kickoff >= startOfLocalDay(now) && kickoff <= weekEnd;
}

export function gamePassesFilters(
  game: DigestView["games"][number],
  filters: InsightsFilterState,
  allLeagues: string[],
  now = new Date(),
): boolean {
  return (
    matchesLeague(game, filters.leagues) &&
    matchesProbability(game, filters.probabilityMin, filters.probabilityMax) &&
    matchesSpread(game, filters.spreadMin, filters.spreadMax) &&
    matchesDate(game, filters.datePreset, now)
  );
}

export function filterDigestGames(
  games: DigestView["games"],
  filters: InsightsFilterState,
  allLeagues: string[],
  now = new Date(),
): DigestView["games"] {
  return games.filter((game) => gamePassesFilters(game, filters, allLeagues, now));
}

function recommendationGame(digest: DigestView): DigestView["games"][number] | null {
  if (!digest.recommendation) {
    return null;
  }
  return (
    digest.games.find(
      (game) =>
        game.homeTeam === digest.recommendation!.homeTeam &&
        game.awayTeam === digest.recommendation!.awayTeam &&
        game.commenceTime === digest.recommendation!.commenceTime,
    ) ?? null
  );
}

function recommendationMatchesFilters(
  digest: DigestView,
  filters: InsightsFilterState,
  allLeagues: string[],
  now = new Date(),
): boolean {
  if (!digest.recommendation) {
    return false;
  }

  const game = recommendationGame(digest);
  if (!game) {
    return false;
  }

  if (!gamePassesFilters(game, filters, allLeagues, now)) {
    return false;
  }

  const prob = digest.recommendation.moneyline.impliedProbability * 100;
  if (prob < filters.probabilityMin || prob > filters.probabilityMax) {
    return false;
  }

  const spreadPoint = digest.recommendation.spread?.point;
  if (typeof spreadPoint === "number") {
    if (spreadPoint < filters.spreadMin || spreadPoint > filters.spreadMax) {
      return false;
    }
  }

  return true;
}

function parlayLegMatchesFilters(
  leg: NonNullable<DigestView["parlay"]>["legs"][number],
  digest: DigestView,
  filters: InsightsFilterState,
  allLeagues: string[],
  now = new Date(),
): boolean {
  const game = digest.games.find(
    (item) =>
      item.homeTeam.includes(leg.opponent) ||
      item.awayTeam.includes(leg.opponent) ||
      item.homeTeam.includes(leg.teamName) ||
      item.awayTeam.includes(leg.teamName),
  );

  if (!game) {
    const prob = leg.winProbability * 100;
    return prob >= filters.probabilityMin && prob <= filters.probabilityMax;
  }

  if (!gamePassesFilters(game, filters, allLeagues, now)) {
    return false;
  }

  const prob = leg.winProbability * 100;
  return prob >= filters.probabilityMin && prob <= filters.probabilityMax;
}

export type FilteredDigest = {
  recommendation: DigestView["recommendation"];
  parlay: DigestView["parlay"];
  games: DigestView["games"];
};

export function applyInsightsFilters(
  digest: DigestView | undefined,
  filters: InsightsFilterState,
  now = new Date(),
): FilteredDigest {
  if (!digest) {
    return { recommendation: null, parlay: null, games: [] };
  }

  const allLeagues = leaguesForFilter(digest.games).map((league) => league.sportKey);
  const games = filterDigestGames(digest.games, filters, allLeagues, now);

  const recommendation = recommendationMatchesFilters(digest, filters, allLeagues, now)
    ? digest.recommendation
    : null;

  let parlay: DigestView["parlay"] = null;
  if (digest.parlay) {
    const legs = digest.parlay.legs.filter((leg) =>
      parlayLegMatchesFilters(leg, digest, filters, allLeagues, now),
    );
    if (legs.length >= 2 && legs.length === digest.parlay.legs.length) {
      parlay = { ...digest.parlay, legs };
    }
  }

  return { recommendation, parlay, games };
}

export function countActiveFilters(
  filters: InsightsFilterState,
  allLeagues: string[],
  spreadBounds: { min: number; max: number },
): number {
  let count = 0;

  if (!isAllLeaguesSelected(filters.leagues, allLeagues)) {
    count += 1;
  }
  if (filters.probabilityMin !== DEFAULT_PROBABILITY_MIN || filters.probabilityMax !== DEFAULT_PROBABILITY_MAX) {
    count += 1;
  }
  if (filters.spreadMin !== spreadBounds.min || filters.spreadMax !== spreadBounds.max) {
    count += 1;
  }
  if (filters.datePreset !== "all") {
    count += 1;
  }

  return count;
}

export function readStoredFilters(): Partial<InsightsFilterState> | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(INSIGHTS_FILTERS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Partial<InsightsFilterState>;
  } catch {
    return null;
  }
}

export function writeStoredFilters(filters: InsightsFilterState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(INSIGHTS_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignore quota errors
  }
}
