import { beforeEach, describe, expect, it, vi } from "vitest";
import { OddsMessage, SportKey } from "@/lib/constants";

vi.mock("@/lib/odds-snapshot", () => ({
  listOddsSnapshots: vi.fn(),
  isOddsQuotaExhausted: vi.fn(),
}));

import { isOddsQuotaExhausted, listOddsSnapshots } from "@/lib/odds-snapshot";
import { buildPreviewResponse } from "@/lib/preview-response";

const listMock = vi.mocked(listOddsSnapshots);
const exhaustedMock = vi.mocked(isOddsQuotaExhausted);

describe("buildPreviewResponse", () => {
  beforeEach(() => {
    listMock.mockReset();
    exhaustedMock.mockReset();
  });

  it("does not fetch live odds and reports an empty snapshot", async () => {
    listMock.mockResolvedValue([]);
    exhaustedMock.mockResolvedValue(false);

    const payload = await buildPreviewResponse([{ sportKey: SportKey.Epl, teamName: "Arsenal" }]);

    expect(listMock).toHaveBeenCalled();
    expect(payload.error).toBe(OddsMessage.SnapshotEmpty);
    expect(payload.digest.games).toEqual([]);
  });

  it("explains a spent quota even when a snapshot exists", async () => {
    listMock.mockResolvedValue([
      {
        sportKey: SportKey.Epl,
        fetchedAt: new Date("2026-08-01T00:00:00.000Z"),
        events: [
          {
            id: "epl-1",
            sport_key: SportKey.Epl,
            sport_title: "EPL",
            commence_time: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
            home_team: "Arsenal",
            away_team: "Liverpool",
            bookmakers: [],
          },
        ],
      },
    ]);
    exhaustedMock.mockResolvedValue(true);

    const payload = await buildPreviewResponse([{ sportKey: SportKey.Epl, teamName: "Arsenal" }]);

    expect(payload.error).toBe(OddsMessage.QuotaPaused);
    expect(payload.digest.games.length).toBeGreaterThan(0);
  });

  it("returns a moneyline preview when the snapshot has no spread market", async () => {
    listMock.mockResolvedValue([
      {
        sportKey: SportKey.Nfl,
        fetchedAt: new Date("2026-09-01T00:00:00.000Z"),
        events: [
          {
            id: "nfl-1",
            sport_key: SportKey.Nfl,
            sport_title: "NFL",
            commence_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
            home_team: "Kansas City Chiefs",
            away_team: "Buffalo Bills",
            bookmakers: [
              {
                key: "draftkings",
                title: "DraftKings",
                last_update: new Date().toISOString(),
                markets: [
                  {
                    key: "h2h",
                    outcomes: [
                      { name: "Kansas City Chiefs", price: 1.8 },
                      { name: "Buffalo Bills", price: 2.1 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    exhaustedMock.mockResolvedValue(false);

    const payload = await buildPreviewResponse([
      { sportKey: SportKey.Nfl, teamName: "Kansas City Chiefs" },
    ]);

    expect(payload.digest.recommendation?.teamName).toBe("Kansas City Chiefs");
    expect(payload.digest.recommendation?.spread).toBeNull();
    expect(payload.digest.games[0]?.spreads).toEqual([]);
    expect(payload.digest.games[0]?.lines.length).toBeGreaterThan(0);
  });
});
