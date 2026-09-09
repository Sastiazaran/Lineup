"use client";

import { useEffect, useMemo, useState } from "react";
import { PickResult, PickSelection, Routes, SPORTS, TimeZone } from "@/lib/constants";
import { formatGameClock, formatKickoff, formatPercent } from "@/lib/formatting";
import {
  groupByGameDate,
  selectionLabel,
  shouldGroupNflByDate,
  type LeagueRecord,
  type TinoGame,
  type TinoPick,
} from "@/lib/picks";

type TinoBoard = {
  games: TinoGame[];
  pending: TinoPick[];
  settled: TinoPick[];
  record: { overall: LeagueRecord; leagues: LeagueRecord[] };
  message?: string;
  error?: string;
};

const ALL_LEAGUES = "all";

type TinoPanelProps = {
  isGuest: boolean;
};

export function TinoPanel({ isGuest }: TinoPanelProps) {
  const [board, setBoard] = useState<TinoBoard>();
  const [league, setLeague] = useState(ALL_LEAGUES);
  const [savingId, setSavingId] = useState<string>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (isGuest) {
      return;
    }
    let cancelled = false;
    fetch(Routes.Picks, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = (await response.json()) as TinoBoard;
        if (!cancelled) {
          setBoard(payload);
          if (payload.error) {
            setError(payload.error);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load matches.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  const games = useMemo(
    () => filterByLeague(board?.games ?? [], league),
    [board?.games, league],
  );
  const pending = useMemo(
    () => filterByLeague(board?.pending ?? [], league),
    [board?.pending, league],
  );
  const settled = useMemo(
    () => filterByLeague(board?.settled ?? [], league),
    [board?.settled, league],
  );

  async function pickWinner(eventId: string, selection: string) {
    setSavingId(eventId);
    setError("");
    try {
      const response = await fetch(Routes.Picks, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ eventId, selection }),
      });
      const payload = (await response.json()) as TinoBoard;
      if (!response.ok) {
        setError(payload.error ?? "Could not save that pick.");
        return;
      }
      setBoard(payload);
    } catch {
      setError("Could not save that pick.");
    } finally {
      setSavingId(undefined);
    }
  }

  if (isGuest) {
    return (
      <p className="max-w-xl text-mist">
        <a href={Routes.Login} className="text-lime hover:text-paper">
          Sign in
        </a>{" "}
        to pick winners and keep a hit-rate record by league. Guest mode only stores team favorites on
        this device.
      </p>
    );
  }

  const overall = board?.record.overall;
  const leagueFilters = [
    { key: ALL_LEAGUES, label: "All" },
    ...SPORTS.map((sport) => ({ key: sport.key, label: sport.label })),
  ];

  return (
    <section className="flex flex-col gap-8">
      {error || board?.message ? <p className="text-sm text-lime">{error || board?.message}</p> : null}

      <div className="flex flex-wrap gap-4">
        <RecordCard record={overall} />
        {board?.record.leagues.map((item) => (
          <RecordCard key={item.sportKey} record={item} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {leagueFilters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setLeague(item.key)}
            className={`border px-3 py-1 text-sm tracking-wide ${
              league === item.key
                ? "border-lime bg-lime text-ink"
                : "border-white/20 text-mist hover:text-paper"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div>
        <h2 className="font-display text-2xl tracking-wide text-lime">Upcoming</h2>
        {games.length === 0 ? (
          <p className="mt-3 text-mist">No upcoming games in this league yet.</p>
        ) : shouldGroupNflByDate(games) ? (
          <div className="mt-4 flex flex-col gap-8">
            {groupByGameDate(games).map((group) => (
              <div key={group.dateKey}>
                <h3 className="font-display text-xl tracking-wide text-paper">{group.label}</h3>
                <ul className="mt-3 flex flex-col gap-6">
                  {group.items.map((game) => (
                    <UpcomingGame
                      key={game.eventId}
                      game={game}
                      timeLabel={formatGameClock(game.commenceTime, TimeZone.Nfl)}
                      savingId={savingId}
                      onPick={pickWinner}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-6">
            {games.map((game) => (
              <UpcomingGame
                key={game.eventId}
                game={game}
                timeLabel={`${game.sportTitle} · ${formatKickoff(game.commenceTime)}`}
                savingId={savingId}
                onPick={pickWinner}
              />
            ))}
          </ul>
        )}
      </div>

      {pending.length > 0 ? (
        <div>
          <h2 className="font-display text-2xl tracking-wide text-lime">Awaiting result</h2>
          {shouldGroupNflByDate(pending) ? (
            <div className="mt-4 flex flex-col gap-6">
              {groupByGameDate(pending).map((group) => (
                <div key={group.dateKey}>
                  <h3 className="font-display text-lg tracking-wide text-paper">{group.label}</h3>
                  <ul className="mt-2 flex flex-col gap-3">
                    {group.items.map((pick) => (
                      <PendingPick key={pick.eventId} pick={pick} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {pending.map((pick) => (
                <PendingPick key={pick.eventId} pick={pick} />
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {settled.length > 0 ? (
        <div>
          <h2 className="font-display text-2xl tracking-wide text-lime">Results</h2>
          {shouldGroupNflByDate(settled) ? (
            <div className="mt-4 flex flex-col gap-6">
              {groupByGameDate(settled).map((group) => (
                <div key={group.dateKey}>
                  <h3 className="font-display text-lg tracking-wide text-paper">{group.label}</h3>
                  <ul className="mt-2 flex flex-col gap-3">
                    {group.items.map((pick) => (
                      <SettledPick key={pick.eventId} pick={pick} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {settled.map((pick) => (
                <SettledPick key={pick.eventId} pick={pick} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

function UpcomingGame({
  game,
  timeLabel,
  savingId,
  onPick,
}: {
  game: TinoGame;
  timeLabel: string;
  savingId?: string;
  onPick: (eventId: string, selection: string) => void;
}) {
  return (
    <li>
      <p className="text-sm uppercase tracking-wider text-mist">{timeLabel}</p>
      <p className="text-lg">
        {game.awayTeam} at {game.homeTeam}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <PickButton
          label={game.awayTeam}
          selected={game.selection === PickSelection.Away}
          disabled={savingId === game.eventId}
          onClick={() => void onPick(game.eventId, PickSelection.Away)}
        />
        {game.allowsDraw ? (
          <PickButton
            label="Draw"
            selected={game.selection === PickSelection.Draw}
            disabled={savingId === game.eventId}
            onClick={() => void onPick(game.eventId, PickSelection.Draw)}
          />
        ) : null}
        <PickButton
          label={game.homeTeam}
          selected={game.selection === PickSelection.Home}
          disabled={savingId === game.eventId}
          onClick={() => void onPick(game.eventId, PickSelection.Home)}
        />
      </div>
    </li>
  );
}

function PendingPick({ pick }: { pick: TinoPick }) {
  return (
    <li className="text-paper">
      <span className="text-mist">{pick.sportTitle} · </span>
      {pick.awayTeam} at {pick.homeTeam}
      <span className="text-lime"> · {selectionLabel(pick)}</span>
    </li>
  );
}

function SettledPick({ pick }: { pick: TinoPick }) {
  return (
    <li>
      <span className={pick.result === PickResult.Hit ? "text-lime" : "text-clay"}>
        {pick.result === PickResult.Hit ? "Hit" : "Miss"}
      </span>
      <span className="text-paper">
        {" "}
        {pick.awayTeam} {pick.awayScore ?? "–"}–{pick.homeScore ?? "–"} {pick.homeTeam}
      </span>
      <span className="text-mist"> · picked {selectionLabel(pick)}</span>
    </li>
  );
}

function RecordCard({ record }: { record?: LeagueRecord }) {
  if (!record) {
    return (
      <div className="min-w-36 rounded border border-white/15 px-4 py-3">
        <p className="text-sm uppercase tracking-wider text-mist">Overall</p>
        <p className="font-display text-3xl text-paper">—</p>
      </div>
    );
  }
  return (
    <div className="min-w-36 rounded border border-white/15 px-4 py-3">
      <p className="text-sm uppercase tracking-wider text-mist">{record.label}</p>
      <p className="font-display text-3xl text-lime">
        {record.percent === null ? "—" : formatPercent(record.percent)}
      </p>
      <p className="text-sm text-paper">
        {record.hits}-{record.misses}
        {record.total > 0 ? ` (${record.total})` : ""}
      </p>
    </div>
  );
}

function PickButton({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 font-display tracking-wide ${
        selected ? "bg-lime text-ink" : "border border-lime/60 text-lime hover:bg-lime/10"
      } disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

function filterByLeague<T extends { sportKey: string }>(items: T[], league: string): T[] {
  if (league === ALL_LEAGUES) {
    return items;
  }
  return items.filter((item) => item.sportKey === league);
}
