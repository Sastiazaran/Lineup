import { describe, expect, it } from "vitest";
import type { DigestView } from "@/components/insights-panel";
import {
  applyInsightsFilters,
  countActiveFilters,
  defaultFilterState,
  filterDigestGames,
  gamePassesFilters,
  spreadBoundsFromGames,
} from "@/lib/insights-filters";

const now = new Date("2026-08-26T12:00:00.000Z");

function sampleDigest(): DigestView {
  return {
    recommendation: {
      teamName: "Club America",
      sportKey: "soccer_mexico_ligamx",
      sportTitle: "Liga MX",
      homeTeam: "Club America",
      awayTeam: "Guadalajara",
      commenceTime: "2026-08-26T20:00:00.000Z",
      moneyline: { decimalOdds: 1.7, impliedProbability: 0.58 },
      spread: { point: -1.5, decimalOdds: 1.91 },
    },
    parlay: {
      legs: [
        {
          teamName: "Club America",
          opponent: "Guadalajara",
          sportTitle: "Liga MX",
          winProbability: 0.58,
          decimalOdds: 1.7,
        },
        {
          teamName: "Toluca",
          opponent: "Pumas UNAM",
          sportTitle: "Liga MX",
          winProbability: 0.42,
          decimalOdds: 2.2,
        },
      ],
      combinedProbability: 0.24,
      combinedDecimalOdds: 3.74,
      explanation: "Two-leg same-day parlay.",
    },
    games: [
      {
        sportKey: "soccer_mexico_ligamx",
        sportTitle: "Liga MX",
        homeTeam: "Club America",
        awayTeam: "Guadalajara",
        commenceTime: "2026-08-26T20:00:00.000Z",
        lines: [],
        spreads: [
          { name: "Club America", decimalOdds: 1.91, point: -1.5 },
          { name: "Guadalajara", decimalOdds: 1.91, point: 1.5 },
        ],
        winProbabilities: {
          home: { name: "Club America", probability: 0.58, decimalOdds: 1.7 },
          away: { name: "Guadalajara", probability: 0.22, decimalOdds: 4.5 },
          draw: { name: "Draw", probability: 0.2, decimalOdds: 3.6 },
        },
      },
      {
        sportKey: "soccer_mexico_ligamx",
        sportTitle: "Liga MX",
        homeTeam: "Pumas UNAM",
        awayTeam: "Toluca",
        commenceTime: "2026-08-27T02:00:00.000Z",
        lines: [],
        spreads: [{ name: "Toluca", decimalOdds: 1.91, point: -0.5 }],
        winProbabilities: {
          home: { name: "Pumas UNAM", probability: 0.3, decimalOdds: 3.1 },
          away: { name: "Toluca", probability: 0.42, decimalOdds: 2.2 },
          draw: { name: "Draw", probability: 0.28, decimalOdds: 3.2 },
        },
      },
      {
        sportKey: "americanfootball_nfl",
        sportTitle: "NFL",
        homeTeam: "Chiefs",
        awayTeam: "Bills",
        commenceTime: "2026-08-30T20:00:00.000Z",
        lines: [],
        spreads: [
          { name: "Chiefs", decimalOdds: 1.91, point: -3 },
          { name: "Bills", decimalOdds: 1.91, point: 3 },
        ],
        winProbabilities: {
          home: { name: "Chiefs", probability: 0.55, decimalOdds: 1.8 },
          away: { name: "Bills", probability: 0.45, decimalOdds: 2.1 },
        },
      },
    ],
  };
}

describe("spreadBoundsFromGames", () => {
  it("derives min and max spread from game data", () => {
    const bounds = spreadBoundsFromGames(sampleDigest().games);
    expect(bounds.min).toBeLessThanOrEqual(-3);
    expect(bounds.max).toBeGreaterThanOrEqual(3);
  });
});

describe("filterDigestGames", () => {
  it("filters by league selection", () => {
    const digest = sampleDigest();
    const filters = defaultFilterState(["americanfootball_nfl"]);
    filters.leagues = ["americanfootball_nfl"];

    const games = filterDigestGames(digest.games, filters, ["soccer_mexico_ligamx", "americanfootball_nfl"]);
    expect(games).toHaveLength(1);
    expect(games[0]?.sportTitle).toBe("NFL");
  });

  it("filters by win probability range", () => {
    const digest = sampleDigest();
    const filters = defaultFilterState();
    filters.probabilityMin = 50;
    filters.probabilityMax = 60;

    const games = filterDigestGames(digest.games, filters, ["soccer_mexico_ligamx", "americanfootball_nfl"]);
    expect(games.some((game) => game.homeTeam === "Club America")).toBe(true);
    expect(games.some((game) => game.homeTeam === "Pumas UNAM")).toBe(false);
  });

  it("filters by spread range", () => {
    const digest = sampleDigest();
    const filters = defaultFilterState();
    filters.spreadMin = -1;
    filters.spreadMax = 0;

    const games = filterDigestGames(digest.games, filters, ["soccer_mexico_ligamx", "americanfootball_nfl"]);
    expect(games.some((game) => game.homeTeam === "Pumas UNAM")).toBe(true);
    expect(games.some((game) => game.homeTeam === "Club America")).toBe(false);
  });

  it("filters by today preset", () => {
    const digest = sampleDigest();
    const filters = defaultFilterState();
    filters.datePreset = "today";

    const games = filterDigestGames(digest.games, filters, ["soccer_mexico_ligamx", "americanfootball_nfl"], now);
    expect(games).toHaveLength(2);
    expect(games.every((game) => game.sportKey === "soccer_mexico_ligamx")).toBe(true);
    expect(games.some((game) => game.homeTeam === "Chiefs")).toBe(false);
  });
});

describe("applyInsightsFilters", () => {
  it("hides recommendation when it falls outside probability range", () => {
    const digest = sampleDigest();
    const filters = defaultFilterState();
    filters.probabilityMin = 70;
    filters.probabilityMax = 100;

    const result = applyInsightsFilters(digest, filters, now);
    expect(result.recommendation).toBeNull();
  });

  it("hides parlay when any leg is filtered out", () => {
    const digest = sampleDigest();
    const filters = defaultFilterState();
    filters.probabilityMin = 50;
    filters.probabilityMax = 100;

    const result = applyInsightsFilters(digest, filters, now);
    expect(result.parlay).toBeNull();
  });

  it("keeps parlay when all legs pass filters", () => {
    const digest = sampleDigest();
    const filters = defaultFilterState();

    const result = applyInsightsFilters(digest, filters, now);
    expect(result.parlay?.legs).toHaveLength(2);
  });
});

describe("countActiveFilters", () => {
  it("counts non-default filter selections", () => {
    const filters = defaultFilterState(["a", "b"]);
    filters.leagues = ["a"];
    filters.datePreset = "today";
    filters.probabilityMin = 40;

    const count = countActiveFilters(filters, ["a", "b"], { min: -3, max: 3 });
    expect(count).toBe(3);
  });
});

describe("gamePassesFilters", () => {
  it("allows games without spreads when spread filter is active", () => {
    const game = {
      sportKey: "soccer_mexico_ligamx",
      sportTitle: "Liga MX",
      homeTeam: "A",
      awayTeam: "B",
      commenceTime: "2026-08-26T20:00:00.000Z",
      lines: [],
      spreads: [],
      winProbabilities: {
        home: { name: "A", probability: 0.5, decimalOdds: 2 },
        away: { name: "B", probability: 0.5, decimalOdds: 2 },
      },
    };
    const filters = defaultFilterState();
    filters.spreadMin = -1;
    filters.spreadMax = 1;

    expect(gamePassesFilters(game, filters, ["soccer_mexico_ligamx"], now)).toBe(true);
  });
});
