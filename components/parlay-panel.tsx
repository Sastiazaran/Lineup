"use client";

import { useEffect, useMemo, useState } from "react";
import type { DigestView } from "@/components/insights-panel";
import { formatKickoff } from "@/components/parlay-format";
import type { Favorite } from "@/lib/favorites";
import { formatOdds, formatPercent } from "@/lib/formatting";
import { buildLeagueParlayFromDigest, parlayLeagueOptions } from "@/lib/parlay-digest";

type ParlayPanelProps = {
  digest: DigestView | undefined;
  favorites: Favorite[];
  message?: string;
};

export function ParlayPanel({ digest, favorites, message }: ParlayPanelProps) {
  const leagueOptions = useMemo(() => parlayLeagueOptions(digest, favorites), [digest, favorites]);
  const [selectedLeague, setSelectedLeague] = useState<string>("");

  useEffect(() => {
    if (leagueOptions.length === 0) {
      setSelectedLeague("");
      return;
    }
    setSelectedLeague((current) =>
      leagueOptions.some((option) => option.sportKey === current) ? current : leagueOptions[0]!.sportKey,
    );
  }, [leagueOptions]);

  const parlay = useMemo(() => {
    if (!selectedLeague) {
      return null;
    }
    return buildLeagueParlayFromDigest(digest, favorites, selectedLeague);
  }, [digest, favorites, selectedLeague]);

  const selectedLabel = leagueOptions.find((option) => option.sportKey === selectedLeague)?.label;

  if (favorites.length === 0) {
    return (
      <p className="max-w-xl text-mist">
        Pick teams in Team Selection first. Parlays are built from your lineup, one league at a time.
      </p>
    );
  }

  if (leagueOptions.length === 0) {
    return (
      <p className="max-w-xl text-mist">
        No upcoming games for your lineup in the next 48 hours. Check back when the slate fills in.
      </p>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {message ? <p className="text-sm text-lime">{message}</p> : null}

      <section>
        <h2 className="font-display text-xl tracking-wide text-lime">League</h2>
        <p className="mt-2 text-sm text-mist">
          Choose a league to build a parlay using only your teams in that competition.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {leagueOptions.map((option) => (
            <label
              key={option.sportKey}
              className="flex cursor-pointer items-center gap-2 text-sm text-paper"
            >
              <input
                type="radio"
                name="parlay-league"
                checked={selectedLeague === option.sportKey}
                onChange={() => setSelectedLeague(option.sportKey)}
                className="size-3.5 accent-lime"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      {parlay ? (
        <section className="rounded border border-white/15 p-4">
          <h2 className="font-display text-xl tracking-wide text-lime">
            {selectedLabel ? `🔒 ${selectedLabel} parlay` : "🔒 Parlay idea"}
          </h2>
          <ul className="mt-4 flex flex-col gap-3 text-paper">
            {parlay.legs.map((leg) => (
              <li key={`${leg.teamName}-${leg.opponent}-${leg.commenceTime}`}>
                <p className="text-lg">
                  {leg.teamName} vs {leg.opponent}
                </p>
                <p className="text-sm text-mist">
                  {formatKickoff(leg.commenceTime)} · {formatPercent(leg.winProbability)} ·{" "}
                  {formatOdds(leg.decimalOdds)} odds
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-paper">
            Combined ~{formatPercent(parlay.combinedProbability)} win chance ·{" "}
            {formatOdds(parlay.combinedDecimalOdds)} decimal odds
          </p>
          <p className="mt-2 text-sm text-mist">{parlay.explanation}</p>
        </section>
      ) : (
        <p className="text-mist">
          Not enough games in {selectedLabel ?? "this league"} for a parlay. You need at least two of your teams
          playing in the next 48 hours.
        </p>
      )}
    </div>
  );
}
