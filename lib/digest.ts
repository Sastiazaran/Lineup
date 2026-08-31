import { and, eq, gte, isNull } from "drizzle-orm";
import { Resend } from "resend";
import { EnvKey, Routes, SPORTS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { emailLog, favorites, users } from "@/lib/db/schema";
import { renderDigestEmail } from "@/lib/email";
import { getAppUrl, getEmailFrom, requireEnv } from "@/lib/env";
import { refreshStoredOdds } from "@/lib/odds-snapshot";
import { buildDigest, type FavoriteTeam } from "@/lib/recommend";
import { createUnsubscribeToken } from "@/lib/session";

export type DigestRunResult = {
  usersConsidered: number;
  emailsSent: number;
  skipped: number;
};

/**
 * Builds and sends today's digest for every subscribed user with a playable favorite.
 * Live odds are fetched once here (all catalog sports), persisted, then reused.
 * Skips a user when they already received mail today or have no recommended bet in the window.
 * Falls back to the last-good snapshot when the Odds API quota is spent.
 */
export async function runDailyDigest(now = new Date()): Promise<DigestRunResult> {
  const db = getDb();
  const appUrl = getAppUrl();
  const resend = new Resend(requireEnv(EnvKey.ResendApiKey));
  const from = getEmailFrom();

  const subscribers = await db.select().from(users).where(isNull(users.unsubscribedAt));
  const allFavorites = await db.select().from(favorites);
  const catalogKeys = SPORTS.map((sport) => sport.key);
  const { events } = await refreshStoredOdds(catalogKeys);

  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let emailsSent = 0;
  let skipped = 0;

  for (const user of subscribers) {
    const alreadySent = await db
      .select({ id: emailLog.id })
      .from(emailLog)
      .where(and(eq(emailLog.userId, user.id), gte(emailLog.sentAt, startOfDay)))
      .limit(1);

    if (alreadySent[0]) {
      skipped += 1;
      continue;
    }

    const userFavorites: FavoriteTeam[] = allFavorites
      .filter((row) => row.userId === user.id)
      .map((row) => ({ sportKey: row.sportKey, teamName: row.teamName }));

    const digest = buildDigest(events, userFavorites, now);
    if (!digest.recommendation) {
      skipped += 1;
      continue;
    }

    const unsubscribeUrl = `${appUrl}${Routes.UnsubscribeApi}?token=${createUnsubscribeToken(user.id)}`;
    const email = renderDigestEmail({ appUrl, unsubscribeUrl, digest });

    const { error } = await resend.emails.send({
      from,
      to: user.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (error) {
      throw new Error(`Resend failed for ${user.email}: ${error.message}`);
    }

    await db.insert(emailLog).values({
      userId: user.id,
      pickTeam: digest.recommendation.teamName,
      eventId: digest.recommendation.event.id,
    });
    emailsSent += 1;
  }

  return {
    usersConsidered: subscribers.length,
    emailsSent,
    skipped,
  };
}
