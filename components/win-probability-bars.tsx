import type { WinOutcome } from "@/lib/recommend";
import { formatPercent } from "@/lib/formatting";

const BAR_COLORS = ["bg-lime", "bg-emerald-700", "bg-emerald-900"];

type WinProbabilityBarsProps = {
  outcomes: WinOutcome[];
};

export function WinProbabilityBars({ outcomes }: WinProbabilityBarsProps) {
  const visible = outcomes.filter((outcome) => outcome.probability > 0);
  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 max-w-xl">
      <div className="flex h-2.5 overflow-hidden rounded-sm">
        {visible.map((outcome, index) => (
          <div
            key={outcome.name}
            className={BAR_COLORS[index % BAR_COLORS.length]}
            style={{ width: `${outcome.probability * 100}%` }}
            title={`${outcome.name} ${formatPercent(outcome.probability)}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-mist">
        {visible.map((outcome) => `${outcome.name} ${formatPercent(outcome.probability)}`).join(" · ")}
      </p>
    </div>
  );
}
