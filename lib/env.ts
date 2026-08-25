import { EnvKey } from "@/lib/constants";

const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Reads a required environment variable or throws with the missing key name.
 * @param name Process env key
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/**
 * Resend `from` address. Prefers a bare email in env; ignores broken values
 * like a leftover shell `EMAIL_FROM=Lineup` from a failed export.
 */
export function getEmailFrom(): string {
  const raw = (process.env[EnvKey.EmailFrom] ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");

  let address = DEFAULT_FROM_EMAIL;
  if (raw.includes("<") && raw.includes(">")) {
    const inner = raw.slice(raw.indexOf("<") + 1, raw.indexOf(">")).trim();
    if (EMAIL_PATTERN.test(inner)) {
      return `Lineup <${inner}>`;
    }
  } else if (EMAIL_PATTERN.test(raw)) {
    address = raw;
  }

  return `Lineup <${address}>`;
}

/**
 * Public site origin used in magic links and emails.
 */
export function getAppUrl(): string {
  return (
    process.env[EnvKey.AppUrl] ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ).replace(/\/$/, "");
}
