import type { NextResponse } from "next/server";
import { CookieName } from "@/lib/constants";

export const GUEST_COOKIE_VALUE = "1";

export function guestCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  };
}

export async function isGuest(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return store.get(CookieName.Guest)?.value === GUEST_COOKIE_VALUE;
}

export function clearGuestCookie(response: NextResponse) {
  response.cookies.set(CookieName.Guest, "", { ...guestCookieOptions(), maxAge: 0 });
}
