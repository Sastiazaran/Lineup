import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CookieName, Routes } from "@/lib/constants";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(CookieName.Session)?.value;
  const { pathname } = request.nextUrl;

  if (pathname === Routes.Home && !session) {
    return NextResponse.redirect(new URL(Routes.Login, request.url));
  }

  if (pathname === Routes.Login && session) {
    return NextResponse.redirect(new URL(Routes.Home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
