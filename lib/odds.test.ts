import { afterEach, describe, expect, it, vi } from "vitest";
import { OddsApiErrorCode } from "@/lib/constants";
import {
  OddsApiRequestError,
  fetchSportOdds,
  isOutOfUsageCredits,
  oddsCreditsPerCall,
  parseOddsErrorCode,
  parseOddsUsage,
  regionsForSport,
} from "@/lib/odds";

describe("regionsForSport", () => {
  it("uses EU books for soccer and US books for US leagues", () => {
    expect(regionsForSport("soccer_epl")).toBe("eu");
    expect(regionsForSport("baseball_mlb")).toBe("us");
    expect(regionsForSport("basketball_nba")).toBe("us");
  });
});

describe("oddsCreditsPerCall", () => {
  it("is one credit per market in a single region", () => {
    expect(oddsCreditsPerCall()).toBe(2);
  });
});

describe("parseOddsUsage", () => {
  it("reads remaining, used, and last-cost headers", () => {
    const headers = new Headers({
      "x-requests-remaining": "12",
      "x-requests-used": "488",
      "x-requests-last": "2",
    });
    expect(parseOddsUsage(headers)).toEqual({ remaining: 12, used: 488, lastCost: 2 });
  });

  it("returns nulls when headers are missing", () => {
    expect(parseOddsUsage(new Headers())).toEqual({
      remaining: null,
      used: null,
      lastCost: null,
    });
  });
});

describe("parseOddsErrorCode", () => {
  it("reads error_code from JSON bodies", () => {
    expect(parseOddsErrorCode(JSON.stringify({ error_code: OddsApiErrorCode.OutOfUsageCredits }))).toBe(
      OddsApiErrorCode.OutOfUsageCredits,
    );
  });

  it("returns null for non-JSON bodies", () => {
    expect(parseOddsErrorCode("nope")).toBeNull();
  });
});

describe("isOutOfUsageCredits", () => {
  it("matches OUT_OF_USAGE_CREDITS or remaining credits of zero", () => {
    const quota = new OddsApiRequestError("soccer_epl", 401, "{}", OddsApiErrorCode.OutOfUsageCredits);
    expect(isOutOfUsageCredits(quota)).toBe(true);
    expect(
      isOutOfUsageCredits(
        new OddsApiRequestError("soccer_epl", 401, "{}", null, {
          remaining: 0,
          used: 500,
          lastCost: 2,
        }),
      ),
    ).toBe(true);
    expect(isOutOfUsageCredits(new OddsApiRequestError("soccer_epl", 401, "{}", "INVALID_KEY"))).toBe(false);
    expect(isOutOfUsageCredits(new Error("network"))).toBe(false);
  });
});

describe("fetchSportOdds", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("requests eu region for EPL and returns parsed usage", async () => {
    vi.stubEnv("ODDS_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "x-requests-remaining": "10", "x-requests-used": "2", "x-requests-last": "2" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSportOdds("soccer_epl");

    expect(result.usage.remaining).toBe(10);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/sports/soccer_epl/odds");
    expect(calledUrl).toContain("regions=eu");
    expect(calledUrl).not.toContain("regions=us");
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ cache: "no-store" });
  });

  it("throws OddsApiRequestError with the API error_code", async () => {
    vi.stubEnv("ODDS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error_code: OddsApiErrorCode.OutOfUsageCredits }), {
          status: 401,
          headers: { "x-requests-remaining": "0" },
        }),
      ),
    );

    await expect(fetchSportOdds("soccer_epl")).rejects.toMatchObject({
      status: 401,
      errorCode: OddsApiErrorCode.OutOfUsageCredits,
      usage: { remaining: 0 },
    });
  });
});
