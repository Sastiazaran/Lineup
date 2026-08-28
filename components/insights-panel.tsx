"use client";

import {
  explainSpread,
  formatOdds,
  formatPercent,
  formatSpreadPoint,
  spreadUnitForSport,
} from "@/lib/formatting";
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

export function InsightsPanel({ digest, message, isGuest, selectedCount }: InsightsPanelProps) {
  return (
    <section className="flex flex-col gap-8">
      {message ? <p className="text-sm text-lime">{message}</p> : null}
      {!digest?.games?.length ? (
        <p className="max-w-xl text-mist">
          {selectedCount === 0
            ? "Pick teams in Team Selection to see upcoming games, win bars, and parlay ideas."
            : "No favorite-team games in the next 48 hours. Check back when the slate fills in."}
          {isGuest ? " Daily email is not available in guest mode." : null}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
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
                    {game.lines.map((line) => `${line.name} ${line.decimalOdds.toFixed(2)}`).join(" · ")}
                  </p>
                  {game.spreads.length ? (
                    <div className="mt-2 text-sm text-mist">
                      {game.spreads.map((line) => {
                        const note =
                          typeof line.point === "number" ? explainSpread(line.name, line.point, unit) : null;
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
  );
}
