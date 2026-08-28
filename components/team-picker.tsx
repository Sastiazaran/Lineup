"use client";

import { useMemo } from "react";
import { SPORTS, type SportKey } from "@/lib/constants";
import type { Favorite } from "@/lib/favorites";

type TeamPickerProps = {
  teams: Record<string, string[]>;
  selected: Favorite[];
  onToggle: (sportKey: SportKey, teamName: string) => void;
  onSave: () => void;
  status: "idle" | "saving" | "saved" | "error";
  message?: string;
  isGuest?: boolean;
};

export function TeamPicker({
  teams,
  selected,
  onToggle,
  onSave,
  status,
  message,
  isGuest,
}: TeamPickerProps) {
  const selectedCount = selected.length;

  const grouped = useMemo(
    () =>
      SPORTS.map((sport) => ({
        ...sport,
        teams: teams[sport.key] ?? [],
      })),
    [teams],
  );

  function isSelected(sportKey: string, teamName: string): boolean {
    return selected.some((item) => item.sportKey === sportKey && item.teamName === teamName);
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-lg text-mist">
          {selectedCount === 0
            ? "Select the clubs you actually bet. Quiet days stay out of your inbox."
            : `${selectedCount} team${selectedCount === 1 ? "" : "s"} on your list.`}
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={status === "saving"}
          className="bg-lime px-6 py-3 font-display text-lg tracking-wide text-ink hover:bg-paper disabled:opacity-60"
        >
          {status === "saving" ? "Saving…" : "Save lineup"}
        </button>
      </div>
      {message ? <p className="text-sm text-lime">{message}</p> : null}
      {status === "saved" ? (
        <p className="text-sm text-lime">
          {isGuest
            ? "Saved on this device. Sign in with email for daily digest mail."
            : "Saved. Tomorrow’s mail uses this list."}
        </p>
      ) : null}

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
                        onChange={() => onToggle(sport.key, team)}
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
    </div>
  );
}
