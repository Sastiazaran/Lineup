import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { Routes, SPORTS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";

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
  };
  const incoming = body.favorites ?? [];
  const cleaned = incoming
    .map((item) => ({
      sportKey: item.sportKey?.trim() ?? "",
      teamName: item.teamName?.trim() ?? "",
    }))
    .filter((item) => item.sportKey && item.teamName && allowedSports.has(item.sportKey));

  const unique = [
    ...new Map(cleaned.map((item) => [`${item.sportKey}:${item.teamName}`, item])).values(),
  ];

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

  return NextResponse.json({ ok: true, count: unique.length, next: Routes.Home });
}
