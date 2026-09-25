import { describe, expect, it } from "vitest";
import { MarketKey, SPORTS, SportKey } from "@/lib/constants";
import { oddsCreditsPerCall } from "@/lib/odds";
import {
  cleanSpreadPrefs,
  defaultSpreadPrefs,
  leagueWantsSpreads,
  marketsForLeague,
  marketsForSpreads,
} from "@/lib/spread-prefs";

describe("cleanSpreadPrefs", () => {
  it("defaults every league to spreads on", () => {
    const prefs = defaultSpreadPrefs();
    expect(Object.keys(prefs)).toHaveLength(SPORTS.length);
    expect(Object.values(prefs).every(Boolean)).toBe(true);
    expect(cleanSpreadPrefs(undefined)[SportKey.Nfl]).toBe(true);
  });

  it("keeps an explicit opt-out and ignores unknown sports", () => {
    const prefs = cleanSpreadPrefs({
      [SportKey.Nfl]: false,
      not_a_league: false,
    });
    expect(prefs[SportKey.Nfl]).toBe(false);
    expect(prefs[SportKey.Epl]).toBe(true);
    expect(prefs.not_a_league).toBeUndefined();
  });
});

describe("league market choice", () => {
  it("requests spreads when any subscribed user still wants them", () => {
    expect(leagueWantsSpreads(["owner", "friend"], ["friend"])).toBe(true);
    expect(marketsForLeague(["owner"], [])).toBe(`${MarketKey.H2h},${MarketKey.Spreads}`);
    expect(oddsCreditsPerCall(marketsForLeague(["owner"], []))).toBe(2);
  });

  it("requests moneyline only when every subscriber opted out", () => {
    expect(leagueWantsSpreads(["owner"], ["owner"])).toBe(false);
    expect(marketsForLeague(["owner", "friend"], ["owner", "friend"])).toBe(MarketKey.H2h);
    expect(oddsCreditsPerCall(marketsForSpreads(false))).toBe(1);
  });

  it("requests moneyline only when nobody is subscribed", () => {
    expect(leagueWantsSpreads([], [])).toBe(false);
    expect(oddsCreditsPerCall(marketsForLeague([], []))).toBe(1);
  });

  it("prices all 11 leagues at 22 credits with spreads and 11 without", () => {
    expect(SPORTS).toHaveLength(11);
    const withSpreads = SPORTS.reduce(
      (sum) => sum + oddsCreditsPerCall(marketsForLeague(["owner"], [])),
      0,
    );
    const moneylineOnly = SPORTS.reduce((sum) => sum + oddsCreditsPerCall(marketsForSpreads(false)), 0);
    expect(withSpreads).toBe(22);
    expect(moneylineOnly).toBe(11);

    const nflOff = SPORTS.reduce(
      (sum, sport) =>
        sum +
        oddsCreditsPerCall(
          marketsForLeague(["owner"], sport.key === SportKey.Nfl ? ["owner"] : []),
        ),
      0,
    );
    expect(nflOff).toBe(21);
  });
});
