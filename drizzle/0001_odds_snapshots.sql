CREATE TABLE IF NOT EXISTS "odds_snapshots" (
  "sport_key" varchar(80) PRIMARY KEY NOT NULL,
  "events" jsonb NOT NULL,
  "fetched_at" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "odds_quota_state" (
  "id" varchar(32) PRIMARY KEY NOT NULL,
  "requests_remaining" integer,
  "requests_used" integer,
  "last_cost" integer,
  "exhausted_at" timestamptz,
  "last_live_fetch_at" timestamptz,
  "updated_at" timestamptz NOT NULL
);
