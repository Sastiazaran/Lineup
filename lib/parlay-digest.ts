import type { DigestView } from "@/components/insights-panel";
import { SPORTS } from "@/lib/constants";
import type { OddsEvent } from "@/lib/odds";
import {
  buildParlaySuggestion,
  type FavoriteTeam,
  type GamePreview,
  type ParlaySuggestion,
} from "@/lib/recommend";

export type ParlayLeagueOption = {
  sportKey: string;
  label: string;
};

function toGamePreviews(games: DigestView["games"]): GamePreview[] {
  return games.map((game) => ({
    event: {
      id: `${game.sportKey}-${game.homeTeam}-${game.awayTeam}-${game.commenceTime}`,
      sport_key: game.sportKey,
      sport_title: game.sportTitle,
      commence_time: game.commenceTime,
      home_team: game.homeTeam,
      away_team: game.awayTeam,
      bookmakers: [],
    } satisfies OddsEvent,
    lines: [],
    spreads: [],
    winProbabilities: game.winProbabilities,
  }));
}

export function parlayLeagueOptions(
  digest: DigestView | undefined,
  favorites: FavoriteTeam[],
): ParlayLeagueOption[] {
  if (!digest?.games.length || favorites.length === 0) {
    return [];
  }

  const titlesFromGames = new Map(digest.games.map((game) => [game.sportKey, game.sportTitle]));
  const keysWithGames = new Set(digest.games.map((game) => game.sportKey));
  const userLeagueKeys = [...new Set(favorites.map((favorite) => favorite.sportKey))].filter((key) =>
    keysWithGames.has(key),
  );

  return userLeagueKeys
    .map((sportKey) => ({
      sportKey,
      label: titlesFromGames.get(sportKey) ?? SPORTS.find((sport) => sport.key === sportKey)?.label ?? sportKey,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function buildLeagueParlayFromDigest(
  digest: DigestView | undefined,
  favorites: FavoriteTeam[],
  sportKey: string,
): ParlaySuggestion | null {
  if (!digest?.games.length) {
    return null;
  }
  return buildParlaySuggestion(toGamePreviews(digest.games), favorites, { sportKey });
}
