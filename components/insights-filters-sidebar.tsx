"use client";

import { useEffect, useMemo } from "react";
import type { DigestView } from "@/components/insights-panel";
import { RangeSlider } from "@/components/range-slider";
import {
  countActiveFilters,
  defaultFilterState,
  leaguesFromGames,
  spreadBoundsFromGames,
  type InsightsFilterState,
  writeStoredFilters,
} from "@/lib/insights-filters";

type InsightsFiltersSidebarProps = {
  games: DigestView["games"];
  filters: InsightsFilterState;
  onChange: (filters: InsightsFilterState) => void;
  open: boolean;
  onToggle: () => void;
};

const DATE_PRESETS = [
  { value: "all" as const, label: "All upcoming" },
  { value: "today" as const, label: "Today" },
  { value: "this-week" as const, label: "This week" },
];

export function InsightsFiltersSidebar({
  games,
  filters,
  onChange,
  open,
  onToggle,
}: InsightsFiltersSidebarProps) {
  const leagues = useMemo(() => leaguesFromGames(games), [games]);
  const spreadBounds = useMemo(() => spreadBoundsFromGames(games), [games]);
  const allLeagueKeys = useMemo(() => leagues.map((league) => league.sportKey), [leagues]);
  const activeCount = countActiveFilters(filters, allLeagueKeys, spreadBounds);

  useEffect(() => {
    writeStoredFilters(filters);
  }, [filters]);

  function toggleLeague(sportKey: string) {
    const current = filters.leagues.length > 0 ? filters.leagues : allLeagueKeys;
    const next = current.includes(sportKey)
      ? current.filter((key) => key !== sportKey)
      : [...current, sportKey];
    onChange({ ...filters, leagues: next.length === allLeagueKeys.length ? allLeagueKeys : next });
  }

  function isLeagueChecked(sportKey: string): boolean {
    if (filters.leagues.length === 0 || filters.leagues.length === allLeagueKeys.length) {
      return true;
    }
    return filters.leagues.includes(sportKey);
  }

  function resetFilters() {
    onChange({
      ...defaultFilterState(allLeagueKeys),
      spreadMin: spreadBounds.min,
      spreadMax: spreadBounds.max,
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-lg border border-r-0 border-white/20 bg-field-deep/95 px-2 py-4 text-xs font-display tracking-wide text-lime shadow-lg backdrop-blur-sm hover:bg-field/90"
      >
        <span className="[writing-mode:vertical-rl] rotate-180">Filters</span>
        {activeCount > 0 ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-lime text-[10px] font-sans font-bold text-ink">
            {activeCount}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        className="fixed inset-0 z-40 bg-black/20 sm:hidden"
        onClick={onToggle}
      />
      <aside
        aria-label="Insights filters"
        className="fixed right-0 top-0 z-50 flex h-full w-[280px] flex-col border-l border-white/20 bg-field-deep/98 shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-white/15 px-4 py-4">
          <h2 className="font-display text-lg tracking-wide text-lime">Filters</h2>
          <button
            type="button"
            onClick={onToggle}
            className="text-mist hover:text-paper"
            aria-label="Collapse filters"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-6">
            <section>
              <h3 className="mb-3 text-xs uppercase tracking-wider text-mist">League</h3>
              <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                {leagues.map((league) => (
                  <li key={league.sportKey}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-paper">
                      <input
                        type="checkbox"
                        checked={isLeagueChecked(league.sportKey)}
                        onChange={() => toggleLeague(league.sportKey)}
                        className="size-3.5 accent-lime"
                      />
                      <span>{league.sportTitle}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <RangeSlider
                label="Win probability"
                min={0}
                max={100}
                step={1}
                value={[filters.probabilityMin, filters.probabilityMax]}
                onChange={([probabilityMin, probabilityMax]) =>
                  onChange({ ...filters, probabilityMin, probabilityMax })
                }
                formatValue={(value) => `${value}%`}
              />
            </section>

            <section>
              <RangeSlider
                label="Spread"
                min={spreadBounds.min}
                max={spreadBounds.max}
                step={0.5}
                value={[filters.spreadMin, filters.spreadMax]}
                onChange={([spreadMin, spreadMax]) => onChange({ ...filters, spreadMin, spreadMax })}
                formatValue={(value) => (value > 0 ? `+${value}` : String(value))}
              />
            </section>

            <section>
              <h3 className="mb-3 text-xs uppercase tracking-wider text-mist">Date</h3>
              <div className="flex flex-col gap-2">
                {DATE_PRESETS.map((preset) => (
                  <label
                    key={preset.value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-paper"
                  >
                    <input
                      type="radio"
                      name="date-preset"
                      checked={filters.datePreset === preset.value}
                      onChange={() => onChange({ ...filters, datePreset: preset.value })}
                      className="size-3.5 accent-lime"
                    />
                    <span>{preset.label}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-white/15 px-4 py-3">
          <button
            type="button"
            onClick={resetFilters}
            className="w-full border border-white/20 px-3 py-2 text-sm text-mist hover:border-lime hover:text-lime"
          >
            Reset filters
          </button>
        </div>
      </aside>
    </>
  );
}
