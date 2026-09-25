import {
  boolean,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
});

export const magicLinks = pgTable("magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sportKey: varchar("sport_key", { length: 80 }).notNull(),
    teamName: varchar("team_name", { length: 120 }).notNull(),
  },
  (table) => [
    uniqueIndex("favorites_user_sport_team").on(table.userId, table.sportKey, table.teamName),
  ],
);

/**
 * Per-user spread toggle. A missing row means spreads stay on for that league.
 * The shared daily refresh includes spreads only when a subscribed user still wants them.
 */
export const leagueSpreadPrefs = pgTable(
  "league_spread_prefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sportKey: varchar("sport_key", { length: 80 }).notNull(),
    spreadsEnabled: boolean("spreads_enabled").notNull().default(true),
  },
  (table) => [uniqueIndex("league_spread_prefs_user_sport").on(table.userId, table.sportKey)],
);

export const emailLog = pgTable("email_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  pickTeam: varchar("pick_team", { length: 120 }),
  eventId: varchar("event_id", { length: 80 }),
});

/**
 * Last successful Odds API payload per sport. Preview reads this; cron writes it.
 */
export const oddsSnapshots = pgTable("odds_snapshots", {
  sportKey: varchar("sport_key", { length: 80 }).primaryKey(),
  events: jsonb("events").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});

/**
 * Last Odds API `/scores` payload per sport. Tino settle reads this to avoid
 * spending credits on every dashboard load.
 */
export const scoreSnapshots = pgTable("score_snapshots", {
  sportKey: varchar("sport_key", { length: 80 }).primaryKey(),
  events: jsonb("events").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});

/**
 * Winner picks for Tino. One pick per user per Odds API event.
 * `selection` is home/away/draw; `result` stays pending until scores settle it.
 */
export const picks = pgTable(
  "picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: varchar("event_id", { length: 80 }).notNull(),
    sportKey: varchar("sport_key", { length: 80 }).notNull(),
    sportTitle: varchar("sport_title", { length: 80 }).notNull(),
    homeTeam: varchar("home_team", { length: 120 }).notNull(),
    awayTeam: varchar("away_team", { length: 120 }).notNull(),
    commenceTime: timestamp("commence_time", { withTimezone: true }).notNull(),
    selection: varchar("selection", { length: 16 }).notNull(),
    result: varchar("result", { length: 16 }).notNull().default("pending"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("picks_user_event").on(table.userId, table.eventId)],
);

/** Singleton row (`global`) tracking Odds API remaining credits and quota circuit. */
export const oddsQuotaState = pgTable("odds_quota_state", {
  id: varchar("id", { length: 32 }).primaryKey(),
  requestsRemaining: integer("requests_remaining"),
  requestsUsed: integer("requests_used"),
  lastCost: integer("last_cost"),
  exhaustedAt: timestamp("exhausted_at", { withTimezone: true }),
  lastLiveFetchAt: timestamp("last_live_fetch_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
