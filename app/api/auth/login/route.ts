import { NextResponse } from "next/server";
import { EnvKey, Routes, TimeWindow } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { magicLinks } from "@/lib/db/schema";
import { getOrCreateUser } from "@/lib/auth";
import { getAppUrl, getEmailFrom } from "@/lib/env";
import { createMagicToken, hashToken } from "@/lib/session";
import { Resend } from "resend";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function readEmail(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { email?: string };
    return body.email?.trim().toLowerCase() ?? "";
  }
  const form = await request.formData();
  return String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Sends a one-time magic link. Creates the user on first request.
 */
export async function POST(request: Request) {
  const email = await readEmail(request);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const user = await getOrCreateUser(email);
  const token = createMagicToken();
  const expiresAt = new Date(Date.now() + TimeWindow.MagicLinkMinutes * 60 * 1000);

  await getDb().insert(magicLinks).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const verifyUrl = `${getAppUrl()}${Routes.AuthCallback}?token=${token}`;
  const resendKey = process.env[EnvKey.ResendApiKey];

  if (resendKey) {
    const resend = new Resend(resendKey);
    const from = getEmailFrom();
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: "Your Lineup sign-in link",
      html: `<p>Open Lineup:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in ${TimeWindow.MagicLinkMinutes} minutes.</p>`,
    });
    if (error) {
      console.error("Resend magic-link failed:", { from, to: email, error: error.message });
      if (process.env.NODE_ENV !== "production") {
        console.info(`Dev fallback magic link for ${email}: ${verifyUrl}`);
        return NextResponse.redirect(new URL(`${Routes.Login}?sent=1`, request.url), 303);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.info(`Magic link for ${email}: ${verifyUrl}`);
  } else {
    return NextResponse.json({ error: "Email is not configured." }, { status: 500 });
  }

  const wantsJson = request.headers.get("accept")?.includes("application/json");
  if (wantsJson) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.redirect(new URL(`${Routes.Login}?sent=1`, request.url), 303);
}
