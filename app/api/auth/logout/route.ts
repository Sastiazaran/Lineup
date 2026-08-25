import { NextResponse } from "next/server";
import { CookieName, Routes } from "@/lib/constants";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL(Routes.Login, request.url), 303);
  response.cookies.set(CookieName.Session, "", { ...{ httpOnly: true, path: "/" }, maxAge: 0 });
  return response;
}
