import { afterEach, describe, expect, it, vi } from "vitest";
import { OddsApiErrorCode } from "@/lib/constants";
import { fetchSportScores, scoresCreditsPerCall } from "@/lib/scores";

describe("scoresCreditsPerCall", () => {
  it("is 2 because daysFrom is always sent to include completed games", () => {
    expect(scoresCreditsPerCall()).toBe(2);
  });
});

describe("fetchSportScores", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("requests /scores with daysFrom and optional event ids", async () => {
    vi.stubEnv("ODDS_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "x-requests-remaining": "8", "x-requests-used": "4", "x-requests-last": "2" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSportScores("soccer_epl", ["epl-1", "epl-2"]);

    expect(result.usage.remaining).toBe(8);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/sports/soccer_epl/scores");
    expect(calledUrl).toContain("daysFrom=3");
    expect(calledUrl).toContain("eventIds=epl-1%2Cepl-2");
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

    await expect(fetchSportScores("basketball_nba")).rejects.toMatchObject({
      status: 401,
      errorCode: OddsApiErrorCode.OutOfUsageCredits,
      usage: { remaining: 0 },
    });
  });
});
