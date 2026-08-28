"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  explainSpread,
  formatOdds,
  formatPercent,
  formatSpreadPoint,
  spreadUnitForSport,
} from "@/lib/formatting";
import {
  applyInsightsFilters,
  defaultFilterState,
  DEFAULT_SPREAD_MAX,
  DEFAULT_SPREAD_MIN,
  leaguesForFilter,
  readStoredFilters,
  spreadBoundsFromGames,
  syncLeagueSelection,
  type InsightsFilterState,
} from "@/lib/insights-filters";
import { InsightsFiltersSidebar } from "@/components/insights-filters-sidebar";
import { WinProbabilityBars } from "@/components/win-probability-bars";

export type DigestView = {
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

function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

type InsightsPanelProps = {
  digest: DigestView | undefined;
  message?: string;
  isGuest?: boolean;
  selectedCount: number;
};

function buildInitialFilters(games: DigestView["games"], stored: Partial<InsightsFilterState> | null): InsightsFilterState {
  const leagueKeys = leaguesForFilter(games).map((league) => league.sportKey);
  const spreadBounds = spreadBoundsFromGames(games);
  const base = defaultFilterState(leagueKeys);
  base.spreadMin = spreadBounds.min;
  base.spreadMax = spreadBounds.max;

  if (!stored) {
    return base;
  }

  const storedLeagues = Array.isArray(stored.leagues) ? stored.leagues.filter((key) => leagueKeys.includes(key)) : leagueKeys;

  return {
    leagues: storedLeagues,
    probabilityMin: stored.probabilityMin ?? base.probabilityMin,
    probabilityMax: stored.probabilityMax ?? base.probabilityMax,
    spreadMin: stored.spreadMin ?? spreadBounds.min,
    spreadMax: stored.spreadMax ?? spreadBounds.max,
    datePreset: stored.datePreset ?? base.datePreset,
  };
}

export function InsightsPanel({ digest, message, isGuest, selectedCount }: InsightsPanelProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<InsightsFilterState>(() =>
    buildInitialFilters(digest?.games ?? [], null),
  );
  const storedFiltersHydratedRef = useRef(false);

  const games = digest?.games ?? [];

  useEffect(() => {
    const gamesForFilters = digest?.games ?? [];
    const leagueKeys = leaguesForFilter(gamesForFilters).map((league) => league.sportKey);
    const spreadBounds = spreadBoundsFromGames(gamesForFilters);

    if (!storedFiltersHydratedRef.current) {
      storedFiltersHydratedRef.current = true;
      const stored = readStoredFilters();
      if (stored) {
        setFilters(buildInitialFilters(gamesForFilters, stored));
        return;
      }
    }

    if (!digest?.games) {
      return;
    }

    setFilters((current) => ({
      ...current,
      leagues: syncLeagueSelection(current.leagues, leagueKeys),
      spreadMin: current.spreadMin === DEFAULT_SPREAD_MIN ? spreadBounds.min : current.spreadMin,
      spreadMax: current.spreadMax === DEFAULT_SPREAD_MAX ? spreadBounds.max : current.spreadMax,
    }));
  }, [digest?.games]);

  const filtered = useMemo(() => applyInsightsFilters(digest, filters), [digest, filters]);

  const hasSourceGames = games.length > 0;
  const hasFilteredGames = filtered.games.length > 0;

  return (
    <>
      {hasSourceGames ? (
        <InsightsFiltersSidebar
          games={games}
          filters={filters}
          onChange={setFilters}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((value) => !value)}
        />
      ) : null}

      <section className="flex flex-col gap-8">
        {message ? <p className="text-sm text-lime">{message}</p> : null}
        {!hasSourceGames ? (
          <p className="max-w-xl text-mist">
            {selectedCount === 0
              ? "Pick teams in Team Selection to see upcoming games, win bars, and parlay ideas."
              : "No favorite-team games in the next 48 hours. Check back when the slate fills in."}
            {isGuest ? " Daily email is not available in guest mode." : null}
          </p>
        ) : !hasFilteredGames ? (
          <p className="max-w-xl text-mist">
            No games match your filters. Try widening the probability or spread range, or reset filters.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {filtered.recommendation ? (
              <div className="max-w-2xl">
                <p className="text-xl text-lime">
                  Recommended bet: {filtered.recommendation.teamName} to win (ML{" "}
                  {filtered.recommendation.moneyline.decimalOdds.toFixed(2)}
                  {filtered.recommendation.spread
                    ? `, spread ${formatSpreadPoint(filtered.recommendation.spread.point)}`
                    : ""}
                  )
                </p>
                {filtered.recommendation.spread &&
                typeof filtered.recommendation.spread.point === "number" ? (
                  <p className="mt-2 text-sm text-mist">
                    {explainSpread(
                      filtered.recommendation.teamName,
                      filtered.recommendation.spread.point,
                      spreadUnitForSport(filtered.recommendation.sportKey),
                    )}
                  </p>
                ) : null}
              </div>
            ) : null}
            {filtered.parlay ? (
              <div className="max-w-2xl rounded border border-white/15 p-4">
                <h3 className="font-display text-xl tracking-wide text-lime">🔒 Parlay idea</h3>
                <ul className="mt-3 flex flex-col gap-1 text-paper">
                  {filtered.parlay.legs.map((leg) => (
                    <li key={`${leg.teamName}-${leg.opponent}`}>
                      {leg.teamName} vs {leg.opponent} · {formatPercent(leg.winProbability)}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-paper">
                  Combined ~{formatPercent(filtered.parlay.combinedProbability)} win chance ·{" "}
                  {formatOdds(filtered.parlay.combinedDecimalOdds)} decimal odds
                </p>
                <p className="mt-2 text-sm text-mist">{filtered.parlay.explanation}</p>
              </div>
            ) : null}
            <ul className="flex flex-col gap-6">
              {filtered.games.map((game) => {
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
                      {game.lines.map((line) => `${line.name} ${line.decimalOdds.toFixed(2)}`).join(" · ")}
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
    </>
  );
}
