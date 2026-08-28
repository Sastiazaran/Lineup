import { describe, expect, it } from "vitest";
import { SportKey } from "@/lib/constants";
import { cleanFavorites } from "@/lib/favorites";

describe("cleanFavorites", () => {
  it("deduplicates and drops unknown sports", () => {
    const result = cleanFavorites([
      { sportKey: SportKey.Nba, teamName: "Los Angeles Lakers" },
      { sportKey: SportKey.Nba, teamName: "Los Angeles Lakers" },
      { sportKey: "invalid_sport", teamName: "Ghost FC" },
      { sportKey: SportKey.Mlb, teamName: "  New York Yankees  " },
    ]);
    expect(result).toEqual([
      { sportKey: SportKey.Nba, teamName: "Los Angeles Lakers" },
      { sportKey: SportKey.Mlb, teamName: "New York Yankees" },
    ]);
  });

  it("returns empty array for missing input", () => {
    expect(cleanFavorites(undefined)).toEqual([]);
  });
});
