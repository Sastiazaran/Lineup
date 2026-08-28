/**
 * Centralized keys, routes, and product defaults used across the app.
 * Keep literals here so sport keys, cookies, and windows stay consistent.
 */

export const Brand = {
  Name: "Lineup",
  Tagline: "Your teams. Your odds. In the inbox.",
} as const;

export const CookieName = {
  Session: "lineup_session",
} as const;

export const Routes = {
  Home: "/",
  Login: "/login",
  Unsubscribe: "/unsubscribe",
  UnsubscribeApi: "/api/unsubscribe",
  AuthLogin: "/api/auth/login",
  AuthCallback: "/api/auth/callback",
  AuthLogout: "/api/auth/logout",
  Favorites: "/api/favorites",
  Preview: "/api/preview",
  CronDigest: "/api/cron/digest",
} as const;

export const EnvKey = {
  OddsApiKey: "ODDS_API_KEY",
  DatabaseUrl: "DATABASE_URL",
  ResendApiKey: "RESEND_API_KEY",
  EmailFrom: "EMAIL_FROM",
  SessionSecret: "SESSION_SECRET",
  CronSecret: "CRON_SECRET",
  AppUrl: "NEXT_PUBLIC_APP_URL",
} as const;

export const OddsApi = {
  BaseUrl: "https://api.the-odds-api.com/v4",
  Regions: "us,eu",
  Markets: "h2h,spreads",
  OddsFormat: "decimal",
  RevalidateSeconds: 900,
} as const;

export const MarketKey = {
  H2h: "h2h",
  Spreads: "spreads",
} as const;

export const TimeWindow = {
  DigestHours: 48,
  MagicLinkMinutes: 15,
  SessionDays: 30,
} as const;

export const SportKey = {
  Mlb: "baseball_mlb",
  Nba: "basketball_nba",
  Epl: "soccer_epl",
  LaLiga: "soccer_spain_la_liga",
  LigaMx: "soccer_mexico_ligamx",
  Bundesliga: "soccer_germany_bundesliga",
  Ligue1: "soccer_france_ligue_one",
  Eredivisie: "soccer_netherlands_eredivisie",
  ChampionsLeague: "soccer_uefa_champs_league",
  SerieA: "soccer_italy_serie_a",
} as const;

export type SportKey = (typeof SportKey)[keyof typeof SportKey];

export const SPORTS = [
  { key: SportKey.Mlb, label: "MLB", group: "Baseball" },
  { key: SportKey.Nba, label: "NBA", group: "Basketball" },
  { key: SportKey.Epl, label: "Premier League", group: "Soccer" },
  { key: SportKey.LaLiga, label: "La Liga", group: "Soccer" },
  { key: SportKey.Bundesliga, label: "Bundesliga", group: "Soccer" },
  { key: SportKey.Ligue1, label: "Ligue 1", group: "Soccer" },
  { key: SportKey.SerieA, label: "Serie A", group: "Soccer" },
  { key: SportKey.Eredivisie, label: "Eredivisie", group: "Soccer" },
  { key: SportKey.ChampionsLeague, label: "Champions League", group: "Soccer" },
  { key: SportKey.LigaMx, label: "Liga MX", group: "Soccer" },
] as const;

export type SportDefinition = (typeof SPORTS)[number];
