import { and, eq, lte } from "drizzle-orm";
import { PickResult, SPORTS, sportDefinition } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { picks, scoreSnapshots } from "@/lib/db/schema";
import { OddsApiRequestError, isOutOfUsageCredits } from "@/lib/odds";
import {
  getOddsQuotaRemaining,
  isOddsQuotaExhausted,
  listOddsSnapshots,
  recordQuotaUsage,
} from "@/lib/odds-snapshot";
import {
  buildTinoGames,
  buildTinoRecord,
  canChangePick,
  isScoresSnapshotFresh,
  isValidSelection,
  isWithinScoresWindow,
  settlementFromScore,
  type ScoreEvent,
  type TinoGame,
  type TinoPick,
  type LeagueRecord,
} from "@/lib/picks";
import { fetchSportScores, scoresCreditsPerCall } from "@/lib/scores";

export type TinoBoard = {
  games: TinoGame[];
  pending: TinoPick[];
  settled: TinoPick[];
  record: { overall: LeagueRecord; leagues: LeagueRecord[] };
  message?: string;
};

export type SavePickInput = {
  eventId: string;
  selection: string;
};

/**
 * Loads upcoming snapshot games, the user's picks, and hit-rate stats.
 * Settles due picks first when completed scores are available.
 */
export async function loadTinoBoard(userId: string, now = new Date()): Promise<TinoBoard> {
  await settleDuePicks(now);
  const userPicks = await listUserPicks(userId);
  const catalogKeys = SPORTS.map((sport) => sport.key);
  const rows = await listOddsSnapshots(catalogKeys);
  const games = buildTinoGames(
    rows.flatMap((row) => row.events),
    userPicks,
    now,
  );
  const pending = userPicks.filter((pick) => pick.result === PickResult.Pending);
  const settled = userPicks
    .filter((pick) => pick.result === PickResult.Hit || pick.result === PickResult.Miss)
    .sort((a, b) => (b.settledAt ?? "").localeCompare(a.settledAt ?? ""));

  let message: string | undefined;
  if (await isOddsQuotaExhausted()) {
    message = "Odds API quota is used up. Results settle from the last saved scores until it resets.";
  } else if (games.length === 0) {
    message = "Upcoming games appear after the next daily odds refresh.";
  }

  return {
    games: games.filter((game) => !game.locked),
    pending,
    settled,
    record: buildTinoRecord(userPicks),
    message,
  };
}

/**
 * Creates or updates a pending pick before kickoff. Settled picks cannot change.
 */
export async function savePick(userId: string, input: SavePickInput, now = new Date()): Promise<TinoBoard> {
  const event = await findSnapshotEvent(input.eventId);
  if (!event) {
    throw new PickSaveError("That game is not on the current slate.", 404);
  }
  if (!isValidSelection(event.sport_key, input.selection)) {
    throw new PickSaveError("That pick is not valid for this league.", 400);
  }
  const commence = new Date(event.commence_time);
  if (!canChangePick(commence, now)) {
    throw new PickSaveError("Kickoff has started. That pick is locked.", 409);
  }

  const existing = await getUserPick(userId, event.id);
  if (existing && existing.result !== PickResult.Pending) {
    throw new PickSaveError("That pick is already settled.", 409);
  }

  const sportTitle = sportDefinition(event.sport_key)?.label ?? event.sport_title;
  await getDb()
    .insert(picks)
    .values({
      userId,
      eventId: event.id,
      sportKey: event.sport_key,
      sportTitle: sportTitle,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      commenceTime: commence,
      selection: input.selection,
      result: PickResult.Pending,
    })
    .onConflictDoUpdate({
      target: [picks.userId, picks.eventId],
      set: { selection: input.selection },
      where: eq(picks.result, PickResult.Pending),
    });

  return loadTinoBoard(userId, now);
}

/**
 * Fetches completed scores for sports with due pending picks and writes hit/miss.
 * Reuses a 30-minute snapshot so opening Tino does not spend credits every time.
 * Digest cron also calls this; Odds `/odds` refresh is unchanged.
 */
export async function settleDuePicks(now = new Date()): Promise<{ settled: number; fetchedKeys: string[] }> {
  const started = await getDb()
    .select()
    .from(picks)
    .where(and(eq(picks.result, PickResult.Pending), lte(picks.commenceTime, now)));
  const due = started.filter((pick) => isWithinScoresWindow(pick.commenceTime, now));

  if (due.length === 0) {
    return { settled: 0, fetchedKeys: [] };
  }

  const eventIdsBySport = new Map<string, string[]>();
  for (const pick of due) {
    const ids = eventIdsBySport.get(pick.sportKey) ?? [];
    ids.push(pick.eventId);
    eventIdsBySport.set(pick.sportKey, ids);
  }

  const scoresBySport = new Map<string, ScoreEvent[]>();
  const fetchedKeys: string[] = [];
  let remaining = await getOddsQuotaRemaining();
  let quotaExhausted = await isOddsQuotaExhausted();
  const credits = scoresCreditsPerCall();

  for (const [sportKey, eventIds] of eventIdsBySport) {
    const snapshot = await loadScoreSnapshot(sportKey);
    const fresh = snapshot && isScoresSnapshotFresh(snapshot.fetchedAt, now);
    const cannotAfford = remaining !== null && remaining < credits;
    if (fresh || quotaExhausted || cannotAfford) {
      scoresBySport.set(sportKey, snapshot?.events ?? []);
      continue;
    }

    try {
      const live = await fetchSportScores(sportKey, eventIds);
      await upsertScoreSnapshot(sportKey, live.events);
      await recordQuotaUsage(live.usage, live.usage.remaining === 0);
      scoresBySport.set(sportKey, live.events);
      fetchedKeys.push(sportKey);
      remaining = live.usage.remaining;
      if (live.usage.remaining === 0) {
        quotaExhausted = true;
      }
    } catch (error) {
      if (error instanceof OddsApiRequestError) {
        await recordQuotaUsage(error.usage, isOutOfUsageCredits(error));
        if (isOutOfUsageCredits(error)) {
          quotaExhausted = true;
          remaining = 0;
        }
      }
      scoresBySport.set(sportKey, snapshot?.events ?? []);
    }
  }

  const allScores = [...scoresBySport.values()].flat();
  const scoreById = new Map(allScores.map((event) => [event.id, event]));
  let settled = 0;

  for (const pick of due) {
    const update = settlementFromScore(
      {
        eventId: pick.eventId,
        selection: pick.selection as TinoPick["selection"],
        homeTeam: pick.homeTeam,
        awayTeam: pick.awayTeam,
      },
      scoreById.get(pick.eventId),
      now,
    );
    if (!update) {
      continue;
    }
    await getDb()
      .update(picks)
      .set({
        result: update.result,
        homeScore: update.homeScore,
        awayScore: update.awayScore,
        settledAt: update.settledAt,
      })
      .where(
        and(
          eq(picks.userId, pick.userId),
          eq(picks.eventId, pick.eventId),
          eq(picks.result, PickResult.Pending),
        ),
      );
    settled += 1;
  }

  return { settled, fetchedKeys };
}

export class PickSaveError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PickSaveError";
    this.status = status;
  }
}

async function listUserPicks(userId: string): Promise<TinoPick[]> {
  const rows = await getDb().select().from(picks).where(eq(picks.userId, userId));
  return rows.map(serializePick);
}

async function getUserPick(userId: string, eventId: string): Promise<TinoPick | null> {
  const rows = await getDb()
    .select()
    .from(picks)
    .where(and(eq(picks.userId, userId), eq(picks.eventId, eventId)))
    .limit(1);
  return rows[0] ? serializePick(rows[0]) : null;
}

async function findSnapshotEvent(eventId: string) {
  const rows = await listOddsSnapshots(SPORTS.map((sport) => sport.key));
  return rows.flatMap((row) => row.events).find((event) => event.id === eventId) ?? null;
}

async function loadScoreSnapshot(sportKey: string): Promise<{ events: ScoreEvent[]; fetchedAt: Date } | null> {
  const rows = await getDb()
    .select()
    .from(scoreSnapshots)
    .where(eq(scoreSnapshots.sportKey, sportKey))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return { events: row.events as ScoreEvent[], fetchedAt: row.fetchedAt };
}

async function upsertScoreSnapshot(sportKey: string, events: ScoreEvent[]): Promise<void> {
  const fetchedAt = new Date();
  await getDb()
    .insert(scoreSnapshots)
    .values({ sportKey, events, fetchedAt })
    .onConflictDoUpdate({
      target: scoreSnapshots.sportKey,
      set: { events, fetchedAt },
    });
}

function serializePick(row: typeof picks.$inferSelect): TinoPick {
  return {
    eventId: row.eventId,
    sportKey: row.sportKey,
    sportTitle: sportDefinition(row.sportKey)?.label ?? row.sportTitle,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    commenceTime: row.commenceTime.toISOString(),
    selection: row.selection as TinoPick["selection"],
    result: row.result as TinoPick["result"],
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    settledAt: row.settledAt?.toISOString() ?? null,
  };
}
