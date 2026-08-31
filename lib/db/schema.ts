import { integer, jsonb, pgTable, timestamp, uuid, varchar, uniqueIndex } from "drizzle-orm/pg-core";

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
