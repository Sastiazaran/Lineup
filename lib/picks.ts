import {
  OddsApi,
  PickOutcome,
  PickResult,
  PickSelection,
  SPORTS,
  SportKey,
  TimeWindow,
  TimeZone,
  sportAllowsDraw,
  sportDefinition,
} from "@/lib/constants";
import { formatGameDate, gameDateKey } from "@/lib/formatting";
import { teamsMatch } from "@/lib/teams";

export type TinoPick = {
  eventId: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  selection: PickSelection;
  result: PickResult;
  homeScore: number | null;
  awayScore: number | null;
  settledAt: string | null;
};

export type ScoreSide = {
  name: string;
  score: string;
};

export type ScoreEvent = {
  id: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: ScoreSide[] | null;
};

export type UpcomingEvent = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
};

export type TinoGame = {
  eventId: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  allowsDraw: boolean;
  selection: PickSelection | null;
  locked: boolean;
  result: PickResult | null;
  homeScore: number | null;
  awayScore: number | null;
};

export type LeagueRecord = {
  sportKey: string;
  label: string;
  hits: number;
  misses: number;
  total: number;
  percent: number | null;
};

export type DateGroup<T> = {
  dateKey: string;
  label: string;
  items: T[];
};

export type PickSettlement = {
  eventId: string;
  result: typeof PickResult.Hit | typeof PickResult.Miss;
  homeScore: number;
  awayScore: number;
  settledAt: Date;
};

const SELECTIONS = new Set<string>(Object.values(PickSelection));

/**
 * True when a pick can still be created or changed: kickoff has not started.
 */
export function canChangePick(commenceTime: Date, now: Date): boolean {
  return commenceTime.getTime() > now.getTime();
}

/**
 * Accepts home/away always, and draw only for soccer.
 */
export function isValidSelection(sportKey: string, selection: string): selection is PickSelection {
  if (!SELECTIONS.has(selection)) {
    return false;
  }
  if (selection === PickSelection.Draw && !sportAllowsDraw(sportKey)) {
    return false;
  }
  return true;
}

/**
 * Parses a team's score from an Odds API scores array. Null when missing or non-numeric.
 */
export function parseTeamScore(scores: ScoreSide[] | null | undefined, teamName: string): number | null {
  const row = scores?.find((item) => teamsMatch(item.name, teamName));
  if (!row) {
    return null;
  }
  const parsed = Number.parseInt(row.score, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Winner from two integer scores. Equal scores are a draw (soccer, NFL ties).
 */
export function outcomeFromScores(homeScore: number, awayScore: number): PickOutcome {
  if (homeScore > awayScore) {
    return PickOutcome.Home;
  }
  if (awayScore > homeScore) {
    return PickOutcome.Away;
  }
  return PickOutcome.Draw;
}

/**
 * Hit when the saved selection matches the final outcome.
 */
export function resultForPick(
  selection: PickSelection,
  outcome: PickOutcome,
): typeof PickResult.Hit | typeof PickResult.Miss {
  return selection === outcome ? PickResult.Hit : PickResult.Miss;
}

/**
 * Display label for a stored selection.
 */
export function selectionLabel(pick: {
  homeTeam: string;
  awayTeam: string;
  selection: PickSelection;
}): string {
  if (pick.selection === PickSelection.Home) {
    return pick.homeTeam;
  }
  if (pick.selection === PickSelection.Away) {
    return pick.awayTeam;
  }
  return "Draw";
}

/**
 * Settles a pending pick when the score event is completed and both team scores parse.
 * Live (incomplete) games stay pending.
 */
export function settlementFromScore(
  pick: { eventId: string; selection: PickSelection; homeTeam: string; awayTeam: string },
  score: ScoreEvent | undefined,
  now: Date,
): PickSettlement | null {
  if (!score || !score.completed) {
    return null;
  }
  const homeScore = parseTeamScore(score.scores, pick.homeTeam);
  const awayScore = parseTeamScore(score.scores, pick.awayTeam);
  if (homeScore === null || awayScore === null) {
    return null;
  }
  return {
    eventId: pick.eventId,
    result: resultForPick(pick.selection, outcomeFromScores(homeScore, awayScore)),
    homeScore,
    awayScore,
    settledAt: now,
  };
}

/**
 * Applies completed scores onto pending picks. Unmatched or live games are omitted.
 */
export function applyScoresToPicks(
  pending: Array<{ eventId: string; selection: PickSelection; homeTeam: string; awayTeam: string }>,
  scores: ScoreEvent[],
  now: Date,
): PickSettlement[] {
  const byId = new Map(scores.map((event) => [event.id, event]));
  return pending
    .map((pick) => settlementFromScore(pick, byId.get(pick.eventId), now))
    .filter((item): item is PickSettlement => item !== null);
}

/**
 * Hit rate overall and per catalog league. Pending picks are excluded.
 */
export function buildTinoRecord(picks: Array<{ sportKey: string; result: string }>): {
  overall: LeagueRecord;
  leagues: LeagueRecord[];
} {
  const settled = picks.filter(
    (pick) => pick.result === PickResult.Hit || pick.result === PickResult.Miss,
  );
  const overall = toLeagueRecord("all", "Overall", settled);
  const leagues = SPORTS.map((sport) =>
    toLeagueRecord(
      sport.key,
      sport.label,
      settled.filter((pick) => pick.sportKey === sport.key),
    ),
  ).filter((league) => league.total > 0);
  return { overall, leagues };
}

/**
 * Upcoming snapshot events plus the caller's pick, if any. Games that already
 * started are locked. Unknown sports are dropped.
 */
export function buildTinoGames(events: UpcomingEvent[], picks: TinoPick[], now: Date): TinoGame[] {
  const pickByEvent = new Map(picks.map((pick) => [pick.eventId, pick]));
  return events
    .filter((event) => sportDefinition(event.sport_key))
    .map((event) => {
      const pick = pickByEvent.get(event.id);
      const commence = new Date(event.commence_time);
      return {
        eventId: event.id,
        sportKey: event.sport_key,
        sportTitle: sportDefinition(event.sport_key)?.label ?? event.sport_title,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        commenceTime: event.commence_time,
        allowsDraw: sportAllowsDraw(event.sport_key),
        selection: pick?.selection ?? null,
        locked: !canChangePick(commence, now),
        result: pick?.result ?? null,
        homeScore: pick?.homeScore ?? null,
        awayScore: pick?.awayScore ?? null,
      };
    })
    .sort((a, b) => a.commenceTime.localeCompare(b.commenceTime));
}

/**
 * True when a scores snapshot is fresh enough to skip another Odds API call.
 */
export function isScoresSnapshotFresh(
  fetchedAt: Date,
  now: Date,
  freshMinutes = TimeWindow.ScoresFreshMinutes,
): boolean {
  return now.getTime() - fetchedAt.getTime() < freshMinutes * 60_000;
}

/**
 * `/scores?daysFrom` only returns games that started in this window.
 * Older pending picks must not trigger more live calls.
 */
export function isWithinScoresWindow(commenceTime: Date, now: Date): boolean {
  const oldest = now.getTime() - OddsApi.ScoresDaysFrom * 24 * 60 * 60 * 1000;
  return commenceTime.getTime() >= oldest && commenceTime.getTime() <= now.getTime();
}

/**
 * NFL slates are Thursday / Sunday / Monday in Eastern Time. True when every
 * item is an NFL game so the board can group by that gameday.
 */
export function shouldGroupNflByDate(items: Array<{ sportKey: string }>): boolean {
  return items.length > 0 && items.every((item) => item.sportKey === SportKey.Nfl);
}

/**
 * Groups games by calendar date in `timeZone`, keeping kickoff order inside each day.
 */
export function groupByGameDate<T extends { commenceTime: string }>(
  items: T[],
  timeZone = TimeZone.Nfl,
): DateGroup<T>[] {
  const groups = new Map<string, DateGroup<T>>();
  for (const item of items) {
    const dateKey = gameDateKey(item.commenceTime, timeZone);
    const existing = groups.get(dateKey);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(dateKey, {
      dateKey,
      label: formatGameDate(item.commenceTime, timeZone),
      items: [item],
    });
  }
  return [...groups.values()];
}

function toLeagueRecord(
  sportKey: string,
  label: string,
  picks: Array<{ result: string }>,
): LeagueRecord {
  const hits = picks.filter((pick) => pick.result === PickResult.Hit).length;
  const misses = picks.filter((pick) => pick.result === PickResult.Miss).length;
  const total = hits + misses;
  return {
    sportKey,
    label,
    hits,
    misses,
    total,
    percent: total === 0 ? null : hits / total,
  };
}
