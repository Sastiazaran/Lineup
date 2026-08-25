import { EnvKey, MarketKey, OddsApi } from "@/lib/constants";
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

/**
 * Fetches upcoming moneylines and spreads for one sport from The Odds API.
 * Responses are cached for {@link OddsApi.RevalidateSeconds} to stay within the free credit quota.
 * @param sportKey The Odds API sport key, e.g. `soccer_epl`
 */
export async function fetchSportOdds(sportKey: string): Promise<OddsEvent[]> {
  const apiKey = requireEnv(EnvKey.OddsApiKey);
  const url = new URL(`${OddsApi.BaseUrl}/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", OddsApi.Regions);
  url.searchParams.set("markets", OddsApi.Markets);
  url.searchParams.set("oddsFormat", OddsApi.OddsFormat);

  const response = await fetch(url, {
    next: { revalidate: OddsApi.RevalidateSeconds },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Odds API ${response.status} for ${sportKey}: ${detail}`);
  }

  return (await response.json()) as OddsEvent[];
}

/**
 * Loads odds for each distinct sport key, skipping empty lists.
 */
export async function fetchOddsForSports(sportKeys: string[]): Promise<OddsEvent[]> {
  const unique = [...new Set(sportKeys)];
  const batches = await Promise.all(unique.map((key) => fetchSportOdds(key)));
  return batches.flat();
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
