import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CookieName, Routes } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifySessionToken, type SessionPayload } from "@/lib/session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(CookieName.Session)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect(Routes.Login);
  }
  return session;
}

/**
 * Finds the user by email or inserts a new subscriber row.
 */
export async function getOrCreateUser(email: string) {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (existing[0]) {
    return existing[0];
  }
  const inserted = await db.insert(users).values({ email: normalized }).returning();
  const user = inserted[0];
  if (!user) {
    throw new Error("Could not create user");
  }
  return user;
}
