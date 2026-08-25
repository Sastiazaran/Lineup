import { NextResponse } from "next/server";
import { EnvKey, Routes } from "@/lib/constants";
import { runDailyDigest } from "@/lib/digest";

function isAuthorized(request: Request): boolean {
  const secret = process.env[EnvKey.CronSecret];
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Vercel Cron entrypoint. Requires `Authorization: Bearer CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyDigest();
  return NextResponse.json({ ok: true, route: Routes.CronDigest, ...result });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
