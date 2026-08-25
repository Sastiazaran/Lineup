import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { Routes } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyUnsubscribeToken } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const userId = token ? verifyUnsubscribeToken(token) : null;
  if (!userId) {
    return NextResponse.redirect(new URL(`${Routes.Unsubscribe}?status=invalid`, url.origin));
  }

  await getDb()
    .update(users)
    .set({ unsubscribedAt: new Date() })
    .where(eq(users.id, userId));

  return NextResponse.redirect(new URL(`${Routes.Unsubscribe}?status=done`, url.origin));
}
