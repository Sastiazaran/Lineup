import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { EnvKey, TimeWindow } from "@/lib/constants";
import { requireEnv } from "@/lib/env";

export type SessionPayload = {
  userId: string;
  email: string;
  exp: number;
};

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TimeWindow.SessionDays * 24 * 60 * 60,
  };
}

function getSecret(): string {
  return requireEnv(EnvKey.SessionSecret);
}

function toBase64Url(value: Buffer | string): string {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;
  return buffer.toString("base64url");
}

function sign(input: string): string {
  return createHmac("sha256", getSecret()).update(input).digest("base64url");
}

/**
 * Creates a signed session token that expires after {@link TimeWindow.SessionDays}.
 */
export function createSessionToken(userId: string, email: string): string {
  const payload: SessionPayload = {
    userId,
    email,
    exp: Date.now() + TimeWindow.SessionDays * 24 * 60 * 60 * 1000,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }
  const expected = sign(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createMagicToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHmac("sha256", getSecret()).update(token).digest("hex");
}

export function createUnsubscribeToken(userId: string): string {
  const encoded = toBase64Url(JSON.stringify({ userId, purpose: "unsubscribe" }));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }
  const expected = sign(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as {
      userId?: string;
      purpose?: string;
    };
    if (payload.purpose !== "unsubscribe" || !payload.userId) {
      return null;
    }
    return payload.userId;
  } catch {
    return null;
  }
}
