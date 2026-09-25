import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { Routes, SPORTS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { cleanFavorites } from "@/lib/favorites";
import { cleanSpreadPrefs } from "@/lib/spread-prefs";
import { listUserSpreadPrefs, replaceUserSpreadPrefs } from "@/lib/spread-prefs-store";

const allowedSports = new Set<string>(SPORTS.map((sport) => sport.key));

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await getDb()
    .select()
    .from(favorites)
    .where(eq(favorites.userId, session.userId));
  return NextResponse.json({
    favorites: rows.map((row) => ({ sportKey: row.sportKey, teamName: row.teamName })),
    spreadsEnabled: await listUserSpreadPrefs(session.userId),
  });
}

/**
 * Replaces the caller's full favorite list. Unknown sport keys are rejected.
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    favorites?: { sportKey?: string; teamName?: string }[];
    spreadsEnabled?: Record<string, boolean | undefined>;
  };
  const unique = cleanFavorites(body.favorites).filter((item) => allowedSports.has(item.sportKey));

  const db = getDb();
  await db.delete(favorites).where(eq(favorites.userId, session.userId));
  if (unique.length > 0) {
    await db.insert(favorites).values(
      unique.map((item) => ({
        userId: session.userId,
        sportKey: item.sportKey,
        teamName: item.teamName,
      })),
    );
  }

  if (body.spreadsEnabled && typeof body.spreadsEnabled === "object" && !Array.isArray(body.spreadsEnabled)) {
    await replaceUserSpreadPrefs(session.userId, cleanSpreadPrefs(body.spreadsEnabled));
  }

  return NextResponse.json({ ok: true, count: unique.length, next: Routes.Home });
}
