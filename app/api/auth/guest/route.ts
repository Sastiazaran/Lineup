import { NextResponse } from "next/server";
import { CookieName, Routes } from "@/lib/constants";
import { GUEST_COOKIE_VALUE, guestCookieOptions } from "@/lib/guest-server";
import { sessionCookieOptions } from "@/lib/session";

/**
 * Starts a guest session (no email). Clears any authenticated session cookie.
 */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL(Routes.Home, request.url), 303);
  response.cookies.set(CookieName.Session, "", { ...sessionCookieOptions(), maxAge: 0 });
  response.cookies.set(CookieName.Guest, GUEST_COOKIE_VALUE, guestCookieOptions());
  return response;
}
