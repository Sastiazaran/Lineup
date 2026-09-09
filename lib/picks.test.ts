import { describe, expect, it } from "vitest";
import { PickOutcome, PickResult, PickSelection, SportKey } from "@/lib/constants";
import {
  applyScoresToPicks,
  buildTinoGames,
  buildTinoRecord,
  canChangePick,
  groupByGameDate,
  isScoresSnapshotFresh,
  isValidSelection,
  isWithinScoresWindow,
  outcomeFromScores,
  parseTeamScore,
  resultForPick,
  selectionLabel,
  settlementFromScore,
  shouldGroupNflByDate,
} from "@/lib/picks";

const kickoff = "2026-09-10T19:00:00.000Z";
const now = new Date("2026-09-09T18:00:00.000Z");

describe("canChangePick", () => {
  it("allows changes before kickoff and locks at kickoff", () => {
    const commence = new Date(kickoff);
    expect(canChangePick(commence, now)).toBe(true);
    expect(canChangePick(commence, commence)).toBe(false);
    expect(canChangePick(commence, new Date("2026-09-10T19:00:01.000Z"))).toBe(false);
  });
});

describe("isValidSelection", () => {
  it("allows home and away for every catalog sport", () => {
    expect(isValidSelection(SportKey.Nba, PickSelection.Home)).toBe(true);
    expect(isValidSelection(SportKey.Nfl, PickSelection.Away)).toBe(true);
  });

  it("allows draw only for soccer", () => {
    expect(isValidSelection(SportKey.ChampionsLeague, PickSelection.Draw)).toBe(true);
    expect(isValidSelection(SportKey.LigaMx, PickSelection.Draw)).toBe(true);
    expect(isValidSelection(SportKey.Nba, PickSelection.Draw)).toBe(false);
    expect(isValidSelection(SportKey.Nfl, PickSelection.Draw)).toBe(false);
  });

  it("rejects unknown values", () => {
    expect(isValidSelection(SportKey.Epl, "spread")).toBe(false);
  });
});

describe("parseTeamScore", () => {
  it("reads integer scores by team name", () => {
    expect(
      parseTeamScore(
        [
          { name: "Club América", score: "2" },
          { name: "Liverpool", score: "1" },
        ],
        "America",
      ),
    ).toBe(2);
  });

  it("returns null when the team or numeric score is missing", () => {
    expect(parseTeamScore(null, "Arsenal")).toBeNull();
    expect(parseTeamScore([{ name: "Arsenal", score: "n/a" }], "Arsenal")).toBeNull();
  });
});

describe("outcomeFromScores", () => {
  it("returns home, away, or draw", () => {
    expect(outcomeFromScores(3, 1)).toBe(PickOutcome.Home);
    expect(outcomeFromScores(0, 2)).toBe(PickOutcome.Away);
    expect(outcomeFromScores(1, 1)).toBe(PickOutcome.Draw);
    expect(outcomeFromScores(17, 17)).toBe(PickOutcome.Draw);
  });
});

describe("resultForPick", () => {
  it("hits when the selection matches the outcome", () => {
    expect(resultForPick(PickSelection.Home, PickOutcome.Home)).toBe(PickResult.Hit);
    expect(resultForPick(PickSelection.Draw, PickOutcome.Draw)).toBe(PickResult.Hit);
    expect(resultForPick(PickSelection.Away, PickOutcome.Home)).toBe(PickResult.Miss);
    expect(resultForPick(PickSelection.Home, PickOutcome.Draw)).toBe(PickResult.Miss);
  });
});

describe("selectionLabel", () => {
  it("uses team names for home/away and Draw for a draw pick", () => {
    const base = { homeTeam: "Arsenal", awayTeam: "Liverpool" };
    expect(selectionLabel({ ...base, selection: PickSelection.Home })).toBe("Arsenal");
    expect(selectionLabel({ ...base, selection: PickSelection.Away })).toBe("Liverpool");
    expect(selectionLabel({ ...base, selection: PickSelection.Draw })).toBe("Draw");
  });
});

describe("settlementFromScore", () => {
  const pick = {
    eventId: "epl-1",
    selection: PickSelection.Home,
    homeTeam: "Arsenal",
    awayTeam: "Liverpool",
  };

  it("settles a completed game as a hit or miss", () => {
    const settled = settlementFromScore(
      pick,
      {
        id: "epl-1",
        completed: true,
        home_team: "Arsenal",
        away_team: "Liverpool",
        scores: [
          { name: "Arsenal", score: "2" },
          { name: "Liverpool", score: "1" },
        ],
      },
      now,
    );
    expect(settled).toMatchObject({
      eventId: "epl-1",
      result: PickResult.Hit,
      homeScore: 2,
      awayScore: 1,
    });
  });

  it("leaves live games pending", () => {
    expect(
      settlementFromScore(
        pick,
        {
          id: "epl-1",
          completed: false,
          home_team: "Arsenal",
          away_team: "Liverpool",
          scores: [
            { name: "Arsenal", score: "1" },
            { name: "Liverpool", score: "0" },
          ],
        },
        now,
      ),
    ).toBeNull();
  });
});

describe("applyScoresToPicks", () => {
  it("settles only completed matching events", () => {
    const updates = applyScoresToPicks(
      [
        {
          eventId: "epl-1",
          selection: PickSelection.Draw,
          homeTeam: "Arsenal",
          awayTeam: "Liverpool",
        },
        {
          eventId: "nba-1",
          selection: PickSelection.Away,
          homeTeam: "Lakers",
          awayTeam: "Celtics",
        },
      ],
      [
        {
          id: "epl-1",
          completed: true,
          home_team: "Arsenal",
          away_team: "Liverpool",
          scores: [
            { name: "Arsenal", score: "1" },
            { name: "Liverpool", score: "1" },
          ],
        },
      ],
      now,
    );
    expect(updates).toHaveLength(1);
    expect(updates[0]?.result).toBe(PickResult.Hit);
  });
});

describe("buildTinoRecord", () => {
  it("computes overall and per-league percentages from settled picks", () => {
    const record = buildTinoRecord([
      { sportKey: SportKey.Nba, result: PickResult.Hit },
      { sportKey: SportKey.Nba, result: PickResult.Miss },
      { sportKey: SportKey.ChampionsLeague, result: PickResult.Hit },
      { sportKey: SportKey.Nba, result: PickResult.Pending },
    ]);
    expect(record.overall).toMatchObject({ hits: 2, misses: 1, total: 3, percent: 2 / 3 });
    expect(record.leagues).toEqual([
      expect.objectContaining({ sportKey: SportKey.Nba, hits: 1, misses: 1, total: 2, percent: 0.5 }),
      expect.objectContaining({
        sportKey: SportKey.ChampionsLeague,
        hits: 1,
        misses: 0,
        total: 1,
        percent: 1,
      }),
    ]);
  });
});

describe("buildTinoGames", () => {
  it("attaches picks and locks games that have started", () => {
    const games = buildTinoGames(
      [
        {
          id: "nba-1",
          sport_key: SportKey.Nba,
          sport_title: "NBA",
          commence_time: kickoff,
          home_team: "Lakers",
          away_team: "Celtics",
        },
        {
          id: "nba-2",
          sport_key: SportKey.Nba,
          sport_title: "NBA",
          commence_time: "2026-09-09T12:00:00.000Z",
          home_team: "Heat",
          away_team: "Nets",
        },
      ],
      [
        {
          eventId: "nba-1",
          sportKey: SportKey.Nba,
          sportTitle: "NBA",
          homeTeam: "Lakers",
          awayTeam: "Celtics",
          commenceTime: kickoff,
          selection: PickSelection.Home,
          result: PickResult.Pending,
          homeScore: null,
          awayScore: null,
          settledAt: null,
        },
      ],
      now,
    );
    expect(games[0]).toMatchObject({
      eventId: "nba-2",
      locked: true,
      selection: null,
    });
    expect(games[1]).toMatchObject({
      eventId: "nba-1",
      selection: PickSelection.Home,
      locked: false,
      sportTitle: "NBA",
    });
  });
});

describe("isScoresSnapshotFresh", () => {
  it("is fresh within the window and stale after", () => {
    const fetchedAt = new Date("2026-09-09T17:40:00.000Z");
    expect(isScoresSnapshotFresh(fetchedAt, now, 30)).toBe(true);
    expect(isScoresSnapshotFresh(fetchedAt, new Date("2026-09-09T18:11:00.000Z"), 30)).toBe(false);
  });
});

describe("isWithinScoresWindow", () => {
  it("includes games that started in the last 3 days and excludes older ones", () => {
    expect(isWithinScoresWindow(new Date("2026-09-08T18:00:00.000Z"), now)).toBe(true);
    expect(isWithinScoresWindow(new Date("2026-09-06T17:59:00.000Z"), now)).toBe(false);
    expect(isWithinScoresWindow(new Date("2026-09-09T19:00:00.000Z"), now)).toBe(false);
  });
});

describe("shouldGroupNflByDate", () => {
  it("groups only when every game is NFL", () => {
    expect(shouldGroupNflByDate([{ sportKey: SportKey.Nfl }, { sportKey: SportKey.Nfl }])).toBe(true);
    expect(shouldGroupNflByDate([{ sportKey: SportKey.Nfl }, { sportKey: SportKey.Nba }])).toBe(false);
    expect(shouldGroupNflByDate([])).toBe(false);
  });
});

describe("groupByGameDate", () => {
  it("splits NFL kickoffs onto Thursday, Sunday, and Monday Eastern dates", () => {
    const groups = groupByGameDate([
      { id: "tnf", commenceTime: "2026-09-11T00:15:00.000Z" },
      { id: "sun-early", commenceTime: "2026-09-13T17:00:00.000Z" },
      { id: "sun-late", commenceTime: "2026-09-13T20:05:00.000Z" },
      { id: "mnf", commenceTime: "2026-09-15T00:15:00.000Z" },
    ]);
    expect(groups.map((group) => ({ key: group.dateKey, ids: group.items.map((item) => item.id) }))).toEqual(
      [
        { key: "2026-09-10", ids: ["tnf"] },
        { key: "2026-09-13", ids: ["sun-early", "sun-late"] },
        { key: "2026-09-14", ids: ["mnf"] },
      ],
    );
    expect(groups[0]?.label).toBe("Thursday, Sep 10");
    expect(groups[1]?.label).toBe("Sunday, Sep 13");
    expect(groups[2]?.label).toBe("Monday, Sep 14");
  });
});
