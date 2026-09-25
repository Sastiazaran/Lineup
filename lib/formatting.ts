import { TimeZone } from "@/lib/constants";

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

/**
 * Kickoff time in a compact US-style label, e.g. `Wed, Sep 9, 3:00 PM`.
 */
export function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Calendar date in a timezone, e.g. `2026-09-13`. Used to map NFL kickoffs to weeks.
 */
export function gameDateKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * NFL kickoff in Eastern Time, e.g. `Thu, Sep 10, 8:15 PM`.
 */
export function formatNflKickoff(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TimeZone.Nfl,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * Spread point for display, or null when the line has no handicap to show.
 */
export function displaySpreadPoint(spread: { point?: number } | null | undefined): string | null {
  if (typeof spread?.point !== "number") {
    return null;
  }
  return formatSpreadPoint(spread.point);
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
