/** Rounds spread/handicap lines for display (averaged bookmaker points can be noisy). */
export function roundSpread(point: number): number {
  return Math.round(point * 1000) / 1000;
}

export function formatSpreadPoint(point?: number): string {
  if (typeof point !== "number") {
    return "pk";
  }
  const rounded = roundSpread(point);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

export function formatOdds(value: number): string {
  return value.toFixed(2);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatSpread(line: { point?: number; decimalOdds: number } | null): string {
  if (!line || typeof line.point !== "number") {
    return "—";
  }
  return `${formatSpreadPoint(line.point)} (${formatOdds(line.decimalOdds)})`;
}

/**
 * Short, user-facing note on what a spread line means.
 */
export function explainSpread(
  teamName: string,
  point: number | undefined,
  unit: "goal" | "point",
): string | null {
  if (typeof point !== "number" || point === 0) {
    return null;
  }
  const rounded = roundSpread(Math.abs(point));
  const plural = rounded === 1 ? unit : `${unit}s`;
  if (point < 0) {
    return `${teamName} is favored by ${rounded} ${plural} — books expect them to win by about that margin.`;
  }
  return `${teamName} is getting ${rounded} ${plural} — books see them as underdogs by about that margin.`;
}

export function spreadUnitForSport(sportKey: string): "goal" | "point" {
  return sportKey.startsWith("soccer_") ? "goal" : "point";
}
