import { describe, expect, it } from "vitest";
import type { DigestView } from "@/components/insights-panel";
import { buildLeagueParlayFromDigest, parlayLeagueOptions } from "@/lib/parlay-digest";

function sampleDigest(): DigestView {
  return {
    recommendation: null,
    parlay: null,
    games: [
      {
        sportKey: "soccer_epl",
        sportTitle: "EPL",
        homeTeam: "Arsenal",
        awayTeam: "Chelsea",
        commenceTime: "2026-08-26T15:00:00.000Z",
        lines: [],
        spreads: [],
        winProbabilities: {
          home: { name: "Arsenal", probability: 0.55, decimalOdds: 1.8 },
          away: { name: "Chelsea", probability: 0.25, decimalOdds: 4.0 },
          draw: { name: "Draw", probability: 0.2, decimalOdds: 5.0 },
        },
      },
      {
        sportKey: "soccer_epl",
        sportTitle: "EPL",
        homeTeam: "Liverpool",
        awayTeam: "Everton",
        commenceTime: "2026-08-26T17:00:00.000Z",
        lines: [],
        spreads: [],
        winProbabilities: {
          home: { name: "Liverpool", probability: 0.62, decimalOdds: 1.6 },
          away: { name: "Everton", probability: 0.18, decimalOdds: 5.5 },
          draw: { name: "Draw", probability: 0.2, decimalOdds: 4.0 },
        },
      },
      {
        sportKey: "soccer_germany_bundesliga",
        sportTitle: "Bundesliga - Germany",
        homeTeam: "Bayern Munich",
        awayTeam: "Dortmund",
        commenceTime: "2026-08-26T18:00:00.000Z",
        lines: [],
        spreads: [],
        winProbabilities: {
          home: { name: "Bayern Munich", probability: 0.58, decimalOdds: 1.7 },
          away: { name: "Dortmund", probability: 0.22, decimalOdds: 4.5 },
          draw: { name: "Draw", probability: 0.2, decimalOdds: 4.0 },
        },
      },
      {
        sportKey: "soccer_spain_la_liga",
        sportTitle: "La Liga - Spain",
        homeTeam: "Real Madrid",
        awayTeam: "Sevilla",
        commenceTime: "2026-08-26T20:00:00.000Z",
        lines: [],
        spreads: [],
        winProbabilities: {
          home: { name: "Real Madrid", probability: 0.65, decimalOdds: 1.5 },
          away: { name: "Sevilla", probability: 0.15, decimalOdds: 6.0 },
          draw: { name: "Draw", probability: 0.2, decimalOdds: 4.5 },
        },
      },
    ],
  };
}

describe("parlayLeagueOptions", () => {
  it("lists only leagues where the user has favorites with upcoming games", () => {
    const digest = sampleDigest();
    const favorites = [
      { sportKey: "soccer_epl", teamName: "Arsenal" },
      { sportKey: "soccer_epl", teamName: "Liverpool" },
      { sportKey: "soccer_germany_bundesliga", teamName: "Bayern Munich" },
      { sportKey: "soccer_spain_la_liga", teamName: "Real Madrid" },
    ];

    const options = parlayLeagueOptions(digest, favorites);

    expect(options.map((option) => option.sportKey)).toEqual([
      "soccer_germany_bundesliga",
      "soccer_epl",
      "soccer_spain_la_liga",
    ]);
  });
});

describe("buildLeagueParlayFromDigest", () => {
  it("builds a parlay using only the selected league", () => {
    const digest = sampleDigest();
    const favorites = [
      { sportKey: "soccer_epl", teamName: "Arsenal" },
      { sportKey: "soccer_epl", teamName: "Liverpool" },
      { sportKey: "soccer_germany_bundesliga", teamName: "Bayern Munich" },
      { sportKey: "soccer_spain_la_liga", teamName: "Real Madrid" },
    ];

    const eplParlay = buildLeagueParlayFromDigest(digest, favorites, "soccer_epl");
    const bundesligaParlay = buildLeagueParlayFromDigest(digest, favorites, "soccer_germany_bundesliga");

    expect(eplParlay?.legs).toHaveLength(2);
    expect(eplParlay?.legs.every((leg) => leg.sportTitle === "EPL")).toBe(true);
    expect(eplParlay?.legs.map((leg) => leg.teamName).sort()).toEqual(["Arsenal", "Liverpool"]);

    expect(bundesligaParlay).toBeNull();
  });

  it("returns null when fewer than two legs are available in the league", () => {
    const digest = sampleDigest();
    const favorites = [{ sportKey: "soccer_germany_bundesliga", teamName: "Bayern Munich" }];

    expect(buildLeagueParlayFromDigest(digest, favorites, "soccer_germany_bundesliga")).toBeNull();
  });
});
