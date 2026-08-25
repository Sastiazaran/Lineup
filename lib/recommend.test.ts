import { describe, expect, it } from "vitest";
import type { OddsEvent } from "@/lib/odds";
import { buildDigest, consensusByName, impliedProbability } from "@/lib/recommend";
import { teamsMatch } from "@/lib/teams";

const now = new Date("2026-08-25T16:00:00.000Z");

function event(overrides: Partial<OddsEvent> & Pick<OddsEvent, "id" | "home_team" | "away_team">): OddsEvent {
  return {
    sport_key: "soccer_mexico_ligamx",
    sport_title: "Liga MX",
    commence_time: "2026-08-26T01:00:00.000Z",
    bookmakers: [],
    ...overrides,
  };
}

describe("impliedProbability", () => {
  it("converts decimal odds to probability", () => {
    expect(impliedProbability(2)).toBe(0.5);
    expect(impliedProbability(1.5)).toBeCloseTo(2 / 3);
  });
});

describe("consensusByName", () => {
  it("averages bookmaker prices and spread points", () => {
    const lines = consensusByName([
      { name: "Club America", price: 1.8, point: -1.5 },
      { name: "Club America", price: 2.0, point: -1.0 },
      { name: "Guadalajara", price: 4.0, point: 1.5 },
    ]);
    const america = lines.find((line) => line.name === "Club America");
    expect(america?.decimalOdds).toBeCloseTo(1.9);
    expect(america?.point).toBeCloseTo(-1.25);
  });
});

describe("teamsMatch", () => {
  it("matches shortened and accented club names", () => {
    expect(teamsMatch("Club América", "America")).toBe(true);
    expect(teamsMatch("Guadalajara", "Cruz Azul")).toBe(false);
  });
});

describe("buildDigest", () => {
  const americaGuada = event({
    id: "ame-gdl",
    home_team: "Club America",
    away_team: "Guadalajara",
    bookmakers: [
      {
        key: "draftkings",
        title: "DraftKings",
        last_update: now.toISOString(),
        markets: [
          {
            key: "h2h",
            outcomes: [
              { name: "Club America", price: 1.7 },
              { name: "Guadalajara", price: 4.5 },
              { name: "Draw", price: 3.6 },
            ],
          },
          {
            key: "spreads",
            outcomes: [
              { name: "Club America", price: 1.91, point: -1.5 },
              { name: "Guadalajara", price: 1.91, point: 1.5 },
            ],
          },
        ],
      },
    ],
  });

  const pumasToluca = event({
    id: "pum-tol",
    home_team: "Pumas UNAM",
    away_team: "Toluca",
    commence_time: "2026-08-26T03:00:00.000Z",
    bookmakers: [
      {
        key: "fanduel",
        title: "FanDuel",
        last_update: now.toISOString(),
        markets: [
          {
            key: "h2h",
            outcomes: [
              { name: "Pumas UNAM", price: 3.1 },
              { name: "Toluca", price: 2.2 },
              { name: "Draw", price: 3.2 },
            ],
          },
        ],
      },
    ],
  });

  it("recommends the favorite-team moneyline with the highest implied probability", () => {
    const digest = buildDigest(
      [americaGuada, pumasToluca],
      [
        { sportKey: "soccer_mexico_ligamx", teamName: "Club America" },
        { sportKey: "soccer_mexico_ligamx", teamName: "Toluca" },
      ],
      now,
    );

    expect(digest.recommendation?.teamName).toBe("Club America");
    expect(digest.recommendation?.spread?.point).toBe(-1.5);
    expect(digest.games).toHaveLength(2);
  });

  it("ignores shorter odds on teams that are not favorited", () => {
    const digest = buildDigest(
      [americaGuada],
      [{ sportKey: "soccer_mexico_ligamx", teamName: "Guadalajara" }],
      now,
    );
    expect(digest.recommendation?.teamName).toBe("Guadalajara");
  });

  it("skips a recommendation when no favorite plays inside the window", () => {
    const later = event({
      id: "later",
      home_team: "Club America",
      away_team: "Monterrey",
      commence_time: "2026-09-10T01:00:00.000Z",
      bookmakers: americaGuada.bookmakers,
    });
    const digest = buildDigest(
      [later],
      [{ sportKey: "soccer_mexico_ligamx", teamName: "Club America" }],
      now,
    );
    expect(digest.recommendation).toBeNull();
    expect(digest.games).toHaveLength(0);
  });
});
