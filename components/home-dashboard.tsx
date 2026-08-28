"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Routes, type SportKey } from "@/lib/constants";
import type { Favorite } from "@/lib/favorites";
import { readGuestFavorites, writeGuestFavorites } from "@/lib/guest-client";
import { TEAM_ROSTERS } from "@/lib/teams";
import { InsightsPanel, type DigestView } from "@/components/insights-panel";
import { SignOutButton } from "@/components/sign-out-button";
import { TeamPicker } from "@/components/team-picker";

type Tab = "insights" | "teams";

type PreviewResponse = {
  error?: string;
  teams?: Record<string, string[]>;
  digest?: DigestView;
};

type HomeDashboardProps = {
  mode: "authenticated" | "guest";
  email?: string;
  initialFavorites: Favorite[];
};

export function HomeDashboard({ mode, email, initialFavorites }: HomeDashboardProps) {
  const isGuest = mode === "guest";
  const [tab, setTab] = useState<Tab>("insights");
  const [selected, setSelected] = useState<Favorite[]>(initialFavorites);
  const [guestReady, setGuestReady] = useState(!isGuest);
  const [teams, setTeams] = useState<Record<string, string[]>>(TEAM_ROSTERS);
  const [digest, setDigest] = useState<DigestView>();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const previewLoadedRef = useRef(false);

  useEffect(() => {
    if (!isGuest) {
      return;
    }
    setSelected(readGuestFavorites());
    setGuestReady(true);
  }, [isGuest]);

  const loadPreview = useCallback(
    async (favorites: Favorite[]) => {
      const response = await fetch(Routes.Preview, {
        method: isGuest ? "POST" : "GET",
        headers: isGuest ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
        body: isGuest ? JSON.stringify({ favorites }) : undefined,
      });
      const payload = (await response.json()) as PreviewResponse;
      if (payload.teams) {
        setTeams(payload.teams);
      }
      setDigest(payload.digest);
      if (payload.error) {
        setMessage(payload.error);
      }
    },
    [isGuest],
  );

  useEffect(() => {
    if (!guestReady || previewLoadedRef.current) {
      return;
    }
    previewLoadedRef.current = true;
    let cancelled = false;
    loadPreview(selectedRef.current)
      .catch(() => {
        if (!cancelled) {
          setMessage("Could not load live odds yet. You can still pick teams.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadPreview, guestReady]);

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

    if (isGuest) {
      writeGuestFavorites(selected);
      setStatus("saved");
      try {
        await loadPreview(selected);
        setTab("insights");
      } catch {
        setStatus("error");
        setMessage("Saved locally, but could not refresh insights.");
      }
      return;
    }

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
    try {
      await loadPreview(selected);
      setTab("insights");
    } catch {
      setMessage("Saved, but could not refresh insights.");
    }
  }

  return (
    <>
      <header className="flex items-end justify-between gap-4">
        <p className="brand text-5xl tracking-wide text-lime sm:text-6xl">Lineup</p>
        <div className="flex items-center gap-4 text-sm text-mist">
          <span>{isGuest ? "Guest" : email}</span>
          <SignOutButton isGuest={isGuest} />
        </div>
      </header>

      <nav className="mt-10 flex gap-6 border-b border-white/15" aria-label="Main">
        <button
          type="button"
          onClick={() => setTab("insights")}
          className={`border-b-2 pb-3 font-display text-xl tracking-wide transition-colors ${
            tab === "insights"
              ? "border-lime text-lime"
              : "border-transparent text-mist hover:text-paper"
          }`}
        >
          Insights
        </button>
        <button
          type="button"
          onClick={() => setTab("teams")}
          className={`border-b-2 pb-3 font-display text-xl tracking-wide transition-colors ${
            tab === "teams"
              ? "border-lime text-lime"
              : "border-transparent text-mist hover:text-paper"
          }`}
        >
          Team Selection
        </button>
      </nav>

      {tab === "insights" ? (
        <div className="mt-10">
          <h1 className="font-display text-4xl tracking-wide text-paper sm:text-5xl">Today&apos;s slate</h1>
          <div className="mt-8">
            <InsightsPanel
              digest={digest}
              message={message}
              isGuest={isGuest}
              selectedCount={selected.length}
            />
          </div>
        </div>
      ) : (
        <div className="mt-10">
          <h1 className="font-display text-4xl tracking-wide text-paper sm:text-5xl">Pick the teams you bet</h1>
          <div className="mt-10">
            <TeamPicker
              teams={teams}
              selected={selected}
              onToggle={toggle}
              onSave={() => void save()}
              status={status}
              message={message}
              isGuest={isGuest}
            />
          </div>
        </div>
      )}
    </>
  );
}
