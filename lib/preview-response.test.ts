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
});
