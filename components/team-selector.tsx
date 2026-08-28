"use client";

import { useEffect, useMemo, useState } from "react";
import { Routes, SPORTS, type SportKey } from "@/lib/constants";
import {
  explainSpread,
  formatOdds,
  formatPercent,
  formatSpreadPoint,
  spreadUnitForSport,
} from "@/lib/formatting";
import { TEAM_ROSTERS } from "@/lib/teams";
import { WinProbabilityBars } from "@/components/win-probability-bars";

type Favorite = { sportKey: string; teamName: string };

type PreviewResponse = {
  error?: string;
  teams?: Record<string, string[]>;
  digest?: {
    recommendation: {
      teamName: string;
      sportKey: string;
      sportTitle: string;
      homeTeam: string;
      awayTeam: string;
      commenceTime: string;
      moneyline: { decimalOdds: number; impliedProbability: number };
      spread: { point?: number; decimalOdds: number } | null;
    } | null;
    parlay: {
      legs: {
        teamName: string;
        opponent: string;
        sportTitle: string;
        winProbability: number;
        decimalOdds: number;
      }[];
      combinedProbability: number;
      combinedDecimalOdds: number;
      explanation: string;
    } | null;
    games: {
      sportKey: string;
      sportTitle: string;
      homeTeam: string;
      awayTeam: string;
      commenceTime: string;
      lines: { name: string; decimalOdds: number }[];
      spreads: { name: string; decimalOdds: number; point?: number }[];
      winProbabilities: {
        home: { name: string; probability: number; decimalOdds: number };
        away: { name: string; probability: number; decimalOdds: number };
        draw?: { name: string; probability: number; decimalOdds: number };
      };
    }[];
  };
};

function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

type TeamSelectorProps = {
  initialFavorites: Favorite[];
};

export function TeamSelector({ initialFavorites }: TeamSelectorProps) {
  const [selected, setSelected] = useState<Favorite[]>(initialFavorites);
  const [teams, setTeams] = useState<Record<string, string[]>>(TEAM_ROSTERS);
  const [digest, setDigest] = useState<PreviewResponse["digest"]>();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(Routes.Preview)
      .then((response) => response.json())
      .then((payload: PreviewResponse) => {
        if (cancelled) {
          return;
        }
        if (payload.teams) {
          setTeams(payload.teams);
        }
        setDigest(payload.digest);
        if (payload.error) {
          setMessage(payload.error);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("Could not load live odds yet. You can still pick teams.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCount = selected.length;

  const grouped = useMemo(
    () =>
      SPORTS.map((sport) => ({
        ...sport,
        teams: teams[sport.key] ?? TEAM_ROSTERS[sport.key],
      })),
    [teams],
  );

  function isSelected(sportKey: string, teamName: string): boolean {
    return selected.some((item) => item.sportKey === sportKey && item.teamName === teamName);
  }

  function toggle(sportKey: SportKey, teamName: string) {
    setSelected((current) => {
      const exists = current.some((item) => item.sportKey === sportKey && item.teamName === teamName);
      if (exists) {
        return current.filter((item) => !(item.sportKey === sportKey && item.teamName === teamName));
      }
      return [...current, { sportKey, teamName }];
    });
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setMessage("");
    const response = await fetch(Routes.Favorites, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ favorites: selected }),
    });
    if (!response.ok) {
      setStatus("error");
      setMessage("Could not save favorites.");
      return;
    }
    setStatus("saved");
    const preview = (await fetch(Routes.Preview).then((item) => item.json())) as PreviewResponse;
    setDigest(preview.digest);
    if (preview.teams) {
      setTeams(preview.teams);
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-lg text-mist">
          {selectedCount === 0
            ? "Select the clubs you actually bet. Quiet days stay out of your inbox."
            : `${selectedCount} team${selectedCount === 1 ? "" : "s"} on your list.`}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={status === "saving"}
          className="bg-lime px-6 py-3 font-display text-lg tracking-wide text-ink hover:bg-paper disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save lineup"}
        </button>
      </div>
      {message ? <p className="text-sm text-lime">{message}</p> : null}
      {status === "saved" ? <p className="text-sm text-lime">Saved. Tomorrow’s mail uses this list.</p> : null}

      <div className="flex flex-col gap-10">
        {grouped.map((sport) => (
          <section key={sport.key} className="border-t border-white/15 pt-6">
            <h2 className="font-display text-3xl tracking-wide text-paper">
              {sport.label}
              <span className="ml-3 text-base font-sans tracking-normal text-mist">{sport.group}</span>
            </h2>
            <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {sport.teams.map((team) => {
                const checked = isSelected(sport.key, team);
                return (
                  <li key={team}>
                    <label className="flex cursor-pointer items-center gap-3 py-1 text-paper">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(sport.key, team)}
                        className="size-4 accent-lime"
                      />
                      <span>{team}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section className="border-t border-white/15 pt-8">
        <h2 className="font-display text-3xl tracking-wide">Upcoming for your teams</h2>
        {!digest?.games?.length ? (
          <p className="mt-4 max-w-xl text-mist">
            No favorite-team games in the next 48 hours. Save a lineup and check back when the slate fills in.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            {digest.recommendation ? (
              <div className="max-w-2xl">
                <p className="text-xl text-lime">
                  Recommended bet: {digest.recommendation.teamName} to win (ML{" "}
                  {digest.recommendation.moneyline.decimalOdds.toFixed(2)}
                  {digest.recommendation.spread
                    ? `, spread ${formatSpreadPoint(digest.recommendation.spread.point)}`
                    : ""}
                  )
                </p>
                {digest.recommendation.spread &&
                typeof digest.recommendation.spread.point === "number" ? (
                  <p className="mt-2 text-sm text-mist">
                    {explainSpread(
                      digest.recommendation.teamName,
                      digest.recommendation.spread.point,
                      spreadUnitForSport(digest.recommendation.sportKey),
                    )}
                  </p>
                ) : null}
              </div>
            ) : null}
            {digest.parlay ? (
              <div className="max-w-2xl rounded border border-white/15 p-4">
                <h3 className="font-display text-xl tracking-wide text-lime">Parlay idea</h3>
                <ul className="mt-3 flex flex-col gap-1 text-paper">
                  {digest.parlay.legs.map((leg) => (
                    <li key={`${leg.teamName}-${leg.opponent}`}>
                      {leg.teamName} vs {leg.opponent} · {formatPercent(leg.winProbability)}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-paper">
                  Combined ~{formatPercent(digest.parlay.combinedProbability)} win chance ·{" "}
                  {formatOdds(digest.parlay.combinedDecimalOdds)} decimal odds
                </p>
                <p className="mt-2 text-sm text-mist">{digest.parlay.explanation}</p>
              </div>
            ) : null}
            <ul className="flex flex-col gap-6">
              {digest.games.map((game) => {
                const unit = spreadUnitForSport(game.sportKey);
                const barOutcomes = [
                  game.winProbabilities.away,
                  ...(game.winProbabilities.draw ? [game.winProbabilities.draw] : []),
                  game.winProbabilities.home,
                ].sort((a, b) => b.probability - a.probability);
                return (
                  <li key={`${game.homeTeam}-${game.awayTeam}-${game.commenceTime}`}>
                    <p className="text-sm uppercase tracking-wider text-mist">
                      {game.sportTitle} · {formatKickoff(game.commenceTime)}
                    </p>
                    <p className="text-lg">
                      {game.awayTeam} at {game.homeTeam}
                    </p>
                    <WinProbabilityBars outcomes={barOutcomes} />
                    <p className="mt-2 text-mist">
                      {game.lines
                        .map((line) => `${line.name} ${line.decimalOdds.toFixed(2)}`)
                        .join(" · ")}
                    </p>
                    {game.spreads.length ? (
                      <div className="mt-2 text-sm text-mist">
                        {game.spreads.map((line) => {
                          const note =
                            typeof line.point === "number"
                              ? explainSpread(line.name, line.point, unit)
                              : null;
                          return (
                            <p key={line.name}>
                              {line.name} {formatSpreadPoint(line.point)}
                              {note ? ` — ${note}` : ""}
                            </p>
                          );
                        })}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
