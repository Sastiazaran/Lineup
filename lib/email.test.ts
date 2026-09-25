import { describe, expect, it } from "vitest";
import { displaySpreadPoint } from "@/lib/formatting";
import { renderDigestEmail } from "@/lib/email";
import type { OddsEvent } from "@/lib/odds";
import { buildDigest } from "@/lib/recommend";

const now = new Date("2026-08-25T16:00:00.000Z");

function moneylineEvent(withSpread: boolean): OddsEvent {
  return {
    id: "tol-pum",
    sport_key: "soccer_mexico_ligamx",
    sport_title: "Liga MX",
    commence_time: "2026-08-26T03:00:00.000Z",
    home_team: "Pumas UNAM",
    away_team: "Toluca",
    bookmakers: [
      {
        key: "fanduel",
        title: "FanDuel",
        last_update: now.toISOString(),
        markets: [
          {
            key: "h2h",
            outcomes: [
              { name: "Pumas UNAM", price: 3.1 },
              { name: "Toluca", price: 2.2 },
              { name: "Draw", price: 3.2 },
            ],
          },
          ...(withSpread
            ? [
                {
                  key: "spreads",
                  outcomes: [
                    { name: "Pumas UNAM", price: 1.91, point: 0.5 },
                    { name: "Toluca", price: 1.91, point: -0.5 },
                  ],
                },
              ]
            : []),
        ],
      },
    ],
  };
}

function rendered(withSpread: boolean) {
  const digest = buildDigest(
    [moneylineEvent(withSpread)],
    [{ sportKey: "soccer_mexico_ligamx", teamName: "Toluca" }],
    now,
  );
  return {
    digest,
    email: renderDigestEmail({
      appUrl: "https://lineup.example",
      unsubscribeUrl: "https://lineup.example/api/unsubscribe?token=t",
      digest,
    }),
  };
}

describe("digest rendering without a spread", () => {
  it("shows the moneyline and omits an empty spread line", () => {
    const { digest, email } = rendered(false);
    expect(digest.recommendation?.teamName).toBe("Toluca");
    expect(digest.recommendation?.spread).toBeNull();
    expect(digest.games[0]?.spreads).toEqual([]);

    expect(email.html).toContain("ML 2.20");
    expect(email.html).toContain("Toluca ML 2.20");
    expect(email.html).not.toMatch(/spread/i);
    expect(email.text).toContain("ML 2.20");
    expect(email.text).not.toMatch(/spread/i);
    expect(displaySpreadPoint(digest.recommendation?.spread)).toBeNull();
  });

  it("includes the spread when the snapshot has one", () => {
    const { email } = rendered(true);
    expect(email.html).toContain("Spread -0.5");
    expect(email.html).toContain("spread -0.5");
    expect(email.text).toContain("spread -0.5");
    expect(displaySpreadPoint({ point: -0.5 })).toBe("-0.5");
  });
});
