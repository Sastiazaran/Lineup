import { NextResponse } from "next/server";
import { CookieName, Routes } from "@/lib/constants";
import { clearGuestCookie } from "@/lib/guest-server";
import { sessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL(Routes.Login, request.url), 303);
  response.cookies.set(CookieName.Session, "", { ...sessionCookieOptions(), maxAge: 0 });
  clearGuestCookie(response);
  return response;
}
