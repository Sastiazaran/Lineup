import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAppAccess } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { cleanFavorites } from "@/lib/favorites";
import { buildPreviewResponse } from "@/lib/preview-response";

/**
 * Upcoming favorite games plus merged team lists for the picker (authenticated users).
 */
export async function GET() {
  const access = await getAppAccess();
  if (!access || access.mode === "guest") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await getDb()
    .select()
    .from(favorites)
    .where(eq(favorites.userId, access.session.userId));

  const payload = await buildPreviewResponse(
    rows.map((row) => ({ sportKey: row.sportKey, teamName: row.teamName })),
  );
  return NextResponse.json(payload);
}

/**
 * Preview with explicit favorites (guests and optional client refresh).
 */
export async function POST(request: Request) {
  const access = await getAppAccess();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    favorites?: { sportKey?: string; teamName?: string }[];
  };

  let userFavorites = cleanFavorites(body.favorites);

  if (access.mode === "authenticated" && userFavorites.length === 0) {
    const rows = await getDb()
      .select()
      .from(favorites)
      .where(eq(favorites.userId, access.session.userId));
    userFavorites = rows.map((row) => ({ sportKey: row.sportKey, teamName: row.teamName }));
  }

  const payload = await buildPreviewResponse(userFavorites);
  return NextResponse.json(payload);
}
