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
  Guest: "lineup_guest",
} as const;

export const StorageKey = {
  GuestFavorites: "lineup_guest_favorites",
} as const;

export const Routes = {
  Home: "/",
  Login: "/login",
  Unsubscribe: "/unsubscribe",
  UnsubscribeApi: "/api/unsubscribe",
  AuthLogin: "/api/auth/login",
  AuthCallback: "/api/auth/callback",
  AuthLogout: "/api/auth/logout",
  AuthGuest: "/api/auth/guest",
  Favorites: "/api/favorites",
  Preview: "/api/preview",
  Picks: "/api/picks",
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
  RegionUs: "us",
  RegionEu: "eu",
  Markets: "h2h,spreads",
  OddsFormat: "decimal",
  ScoresDaysFrom: 3,
  ScoresCredits: 2,
} as const;

export const OddsApiErrorCode = {
  OutOfUsageCredits: "OUT_OF_USAGE_CREDITS",
} as const;

export const OddsApiHeader = {
  Remaining: "x-requests-remaining",
  Used: "x-requests-used",
  Last: "x-requests-last",
} as const;

export const OddsQuotaStateId = {
  Global: "global",
} as const;

export const SportGroupPrefix = {
  Soccer: "soccer_",
} as const;

export const OddsMessage = {
  SnapshotEmpty: "Odds will appear after the next daily refresh.",
  QuotaPaused: "The Odds API quota is used up until it resets. Insights will use the last saved lines.",
} as const;

export const MarketKey = {
  H2h: "h2h",
  Spreads: "spreads",
} as const;

export const TimeWindow = {
  DigestHours: 48,
  MagicLinkMinutes: 15,
  SessionDays: 30,
  ScoresFreshMinutes: 30,
} as const;

export const TimeZone = {
  Nfl: "America/New_York",
} as const;

/** 2026 regular season: Week 1 is Wed Sep 9–Mon Sep 14 ET, then Thursday-start weeks. */
export const NflSeason = {
  Week1Date: "2026-09-09",
  RegularWeeks: 18,
} as const;

export const NflWeekLabel = {
  Preseason: "Preseason",
  Playoffs: "Playoffs",
  Prefix: "Week",
} as const;

export const PickSelection = {
  Home: "home",
  Away: "away",
  Draw: "draw",
} as const;

export type PickSelection = (typeof PickSelection)[keyof typeof PickSelection];

export const PickResult = {
  Pending: "pending",
  Hit: "hit",
  Miss: "miss",
} as const;

export type PickResult = (typeof PickResult)[keyof typeof PickResult];

export const PickOutcome = {
  Home: "home",
  Away: "away",
  Draw: "draw",
} as const;

export type PickOutcome = (typeof PickOutcome)[keyof typeof PickOutcome];

export const SportKey = {
  Mlb: "baseball_mlb",
  Nba: "basketball_nba",
  Nfl: "americanfootball_nfl",
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
  { key: SportKey.Nfl, label: "NFL", group: "Football" },
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

/**
 * Catalog row for a sport key, or undefined when the key is not in Lineup.
 */
export function sportDefinition(sportKey: string): SportDefinition | undefined {
  return SPORTS.find((sport) => sport.key === sportKey);
}

/**
 * Soccer (1X2) can be picked as home, away, or draw.
 */
export function sportAllowsDraw(sportKey: string): boolean {
  return sportKey.startsWith(SportGroupPrefix.Soccer);
}
