import {
  EnvKey,
  MarketKey,
  OddsApi,
  OddsApiErrorCode,
  OddsApiHeader,
  SportGroupPrefix,
} from "@/lib/constants";
import { requireEnv } from "@/lib/env";

export type OddsOutcome = {
  name: string;
  price: number;
  point?: number;
};

export type OddsMarket = {
  key: string;
  outcomes: OddsOutcome[];
};

export type OddsBookmaker = {
  key: string;
  title: string;
  last_update: string;
  markets: OddsMarket[];
};

export type OddsEvent = {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
};

export type OddsUsage = {
  remaining: number | null;
  used: number | null;
  lastCost: number | null;
};

export type SportOddsResult = {
  events: OddsEvent[];
  usage: OddsUsage;
};

/**
 * HTTP failure from The Odds API, including a parsed `error_code` and usage headers when present.
 */
export class OddsApiRequestError extends Error {
  readonly status: number;
  readonly errorCode: string | null;
  readonly usage: OddsUsage;

  constructor(
    sportKey: string,
    status: number,
    detail: string,
    errorCode: string | null,
    usage: OddsUsage = { remaining: null, used: null, lastCost: null },
  ) {
    super(`Odds API ${status} for ${sportKey}: ${detail}`);
    this.name = "OddsApiRequestError";
    this.status = status;
    this.errorCode = errorCode;
    this.usage = usage;
  }
}

/**
 * Bookmaker region for a sport: soccer uses EU books, US leagues use US books.
 * One region per call halves credit cost versus `us,eu`.
 * @param sportKey The Odds API sport key, e.g. `soccer_epl`
 */
export function regionsForSport(sportKey: string): string {
  return sportKey.startsWith(SportGroupPrefix.Soccer) ? OddsApi.RegionEu : OddsApi.RegionUs;
}

/**
 * Credits charged for one `/odds` call with the configured markets and a single region.
 */
export function oddsCreditsPerCall(): number {
  return OddsApi.Markets.split(",").filter(Boolean).length;
}

/**
 * Reads usage headers returned on every Odds API response.
 * @param headers Fetch response headers
 */
export function parseOddsUsage(headers: Headers): OddsUsage {
  return {
    remaining: parseHeaderInt(headers.get(OddsApiHeader.Remaining)),
    used: parseHeaderInt(headers.get(OddsApiHeader.Used)),
    lastCost: parseHeaderInt(headers.get(OddsApiHeader.Last)),
  };
}

/**
 * Extracts `error_code` from an Odds API JSON error body.
 * @param detail Raw response text
 */
export function parseOddsErrorCode(detail: string): string | null {
  try {
    const parsed = JSON.parse(detail) as { error_code?: unknown };
    return typeof parsed.error_code === "string" ? parsed.error_code : null;
  } catch {
    return null;
  }
}

/**
 * True when the monthly usage quota is spent (`OUT_OF_USAGE_CREDITS` or remaining credits are 0).
 */
export function isOutOfUsageCredits(error: unknown): boolean {
  if (!(error instanceof OddsApiRequestError)) {
    return false;
  }
  return (
    error.errorCode === OddsApiErrorCode.OutOfUsageCredits || error.usage.remaining === 0
  );
}

/**
 * Fetches upcoming moneylines and spreads for one sport. Callers must persist
 * the result; preview must not use this. Uses `cache: "no-store"` so the daily
 * cron is the source of truth instead of a 15-minute fetch cache.
 * @param sportKey The Odds API sport key, e.g. `soccer_epl`
 * @throws {OddsApiRequestError} When the HTTP response is not OK
 */
export async function fetchSportOdds(sportKey: string): Promise<SportOddsResult> {
  const apiKey = requireEnv(EnvKey.OddsApiKey);
  const url = new URL(`${OddsApi.BaseUrl}/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", regionsForSport(sportKey));
  url.searchParams.set("markets", OddsApi.Markets);
  url.searchParams.set("oddsFormat", OddsApi.OddsFormat);

  const response = await fetch(url, { cache: "no-store" });
  const usage = parseOddsUsage(response.headers);

  if (!response.ok) {
    const detail = await response.text();
    throw new OddsApiRequestError(
      sportKey,
      response.status,
      detail,
      parseOddsErrorCode(detail),
      usage,
    );
  }

  return {
    events: (await response.json()) as OddsEvent[],
    usage,
  };
}

export function listH2hOutcomes(event: OddsEvent): OddsOutcome[] {
  return event.bookmakers.flatMap((book) => {
    const market = book.markets.find((item) => item.key === MarketKey.H2h);
    return market?.outcomes ?? [];
  });
}

export function listSpreadOutcomes(event: OddsEvent): OddsOutcome[] {
  return event.bookmakers.flatMap((book) => {
    const market = book.markets.find((item) => item.key === MarketKey.Spreads);
    return market?.outcomes ?? [];
  });
}

function parseHeaderInt(value: string | null): number | null {
  if (value === null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
