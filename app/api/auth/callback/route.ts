import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { CookieName, Routes } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { magicLinks, users } from "@/lib/db/schema";
import { clearGuestCookie } from "@/lib/guest-server";
import { createSessionToken, hashToken, sessionCookieOptions } from "@/lib/session";

/**
 * Consumes a magic-link token and starts a session.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL(`${Routes.Login}?error=missing`, url.origin));
  }

  const db = getDb();
  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(magicLinks)
    .where(and(eq(magicLinks.tokenHash, tokenHash), isNull(magicLinks.consumedAt)))
    .limit(1);

  const link = rows[0];
  if (!link || link.expiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(new URL(`${Routes.Login}?error=expired`, url.origin));
  }

  const userRows = await db.select().from(users).where(eq(users.id, link.userId)).limit(1);
  const user = userRows[0];
  if (!user) {
    return NextResponse.redirect(new URL(`${Routes.Login}?error=expired`, url.origin));
  }

  await db
    .update(magicLinks)
    .set({ consumedAt: new Date() })
    .where(eq(magicLinks.id, link.id));

  if (user.unsubscribedAt) {
    await db.update(users).set({ unsubscribedAt: null }).where(eq(users.id, user.id));
  }

  const response = NextResponse.redirect(new URL(Routes.Home, url.origin));
  response.cookies.set(CookieName.Session, createSessionToken(user.id, user.email), sessionCookieOptions());
  clearGuestCookie(response);
  return response;
}
