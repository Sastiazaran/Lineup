import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CookieName, Routes } from "@/lib/constants";
import { GUEST_COOKIE_VALUE } from "@/lib/guest-server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(CookieName.Session)?.value;
  const guest = request.cookies.get(CookieName.Guest)?.value === GUEST_COOKIE_VALUE;
  const hasAccess = Boolean(session) || guest;
  const { pathname } = request.nextUrl;

  if (pathname === Routes.Home && !hasAccess) {
    return NextResponse.redirect(new URL(Routes.Login, request.url));
  }

  if (pathname === Routes.Login && hasAccess) {
    return NextResponse.redirect(new URL(Routes.Home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
