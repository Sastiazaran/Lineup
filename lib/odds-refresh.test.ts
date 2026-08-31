import { describe, expect, it, vi } from "vitest";
import { OddsApiErrorCode } from "@/lib/constants";
import { OddsApiRequestError, type OddsEvent } from "@/lib/odds";
import { collectSportOdds, alreadyFetchedToday } from "@/lib/odds-refresh";

const eplEvent = {
  id: "epl-1",
  sport_key: "soccer_epl",
  sport_title: "EPL",
  commence_time: "2026-09-01T15:00:00.000Z",
  home_team: "Arsenal",
  away_team: "Liverpool",
  bookmakers: [],
} satisfies OddsEvent;

const laligaSnap = {
  id: "laliga-1",
  sport_key: "soccer_spain_la_liga",
  sport_title: "La Liga",
  commence_time: "2026-09-01T19:00:00.000Z",
  home_team: "Real Madrid",
  away_team: "Barcelona",
  bookmakers: [],
} satisfies OddsEvent;

describe("collectSportOdds", () => {
  it("keeps live events when every sport succeeds", async () => {
    const fetchSport = vi.fn(async (sportKey: string) => ({
      events: sportKey === "soccer_epl" ? [eplEvent] : [],
      remaining: 20,
    }));

    const result = await collectSportOdds({
      sportKeys: ["soccer_epl", "soccer_spain_la_liga"],
      fetchSport,
      loadSnapshot: async () => [],
      creditsPerCall: 2,
    });

    expect(fetchSport).toHaveBeenCalledTimes(2);
    expect(result.fetchedKeys).toEqual(["soccer_epl", "soccer_spain_la_liga"]);
    expect(result.snapshotKeys).toEqual([]);
    expect(result.quotaExhausted).toBe(false);
    expect(result.events).toEqual([eplEvent]);
  });

  it("stops live fetches after OUT_OF_USAGE_CREDITS and uses snapshots", async () => {
    const fetchSport = vi.fn(async (sportKey: string) => {
      if (sportKey === "soccer_epl") {
        throw new OddsApiRequestError("soccer_epl", 401, "{}", OddsApiErrorCode.OutOfUsageCredits);
      }
      return { events: [], remaining: 10 };
    });
    const loadSnapshot = vi.fn(async (sportKey: string) =>
      sportKey === "soccer_spain_la_liga" ? [laligaSnap] : [],
    );

    const result = await collectSportOdds({
      sportKeys: ["soccer_epl", "soccer_spain_la_liga"],
      fetchSport,
      loadSnapshot,
      creditsPerCall: 2,
    });

    expect(fetchSport).toHaveBeenCalledTimes(1);
    expect(result.quotaExhausted).toBe(true);
    expect(result.snapshotKeys).toEqual(["soccer_epl", "soccer_spain_la_liga"]);
    expect(result.events).toEqual([laligaSnap]);
  });

  it("skips live calls when remaining credits cannot cover the next sport", async () => {
    const fetchSport = vi.fn(async () => ({ events: [eplEvent], remaining: 1 }));
    const loadSnapshot = vi.fn(async () => [laligaSnap]);

    const result = await collectSportOdds({
      sportKeys: ["soccer_epl", "soccer_spain_la_liga"],
      fetchSport,
      loadSnapshot,
      creditsPerCall: 2,
    });

    expect(fetchSport).toHaveBeenCalledTimes(1);
    expect(result.quotaExhausted).toBe(true);
    expect(result.events).toEqual([eplEvent, laligaSnap]);
  });

  it("treats remaining=0 without error_code as quota exhausted", async () => {
    const fetchSport = vi.fn(async () => {
      throw new OddsApiRequestError("soccer_epl", 401, "quota", null, {
        remaining: 0,
        used: 500,
        lastCost: 2,
      });
    });

    const result = await collectSportOdds({
      sportKeys: ["soccer_epl", "soccer_spain_la_liga"],
      fetchSport,
      loadSnapshot: async () => [],
      creditsPerCall: 2,
    });

    expect(fetchSport).toHaveBeenCalledTimes(1);
    expect(result.quotaExhausted).toBe(true);
    expect(result.snapshotKeys).toEqual(["soccer_epl", "soccer_spain_la_liga"]);
  });
});

describe("alreadyFetchedToday", () => {
  it("is true only on the same UTC date", () => {
    const noon = new Date("2026-08-30T14:00:00.000Z");
    expect(alreadyFetchedToday(new Date("2026-08-30T01:00:00.000Z"), noon)).toBe(true);
    expect(alreadyFetchedToday(new Date("2026-08-29T23:00:00.000Z"), noon)).toBe(false);
    expect(alreadyFetchedToday(null, noon)).toBe(false);
  });
});
