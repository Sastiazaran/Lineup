CREATE TABLE IF NOT EXISTS "score_snapshots" (
  "sport_key" varchar(80) PRIMARY KEY NOT NULL,
  "events" jsonb NOT NULL,
  "fetched_at" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "picks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_id" varchar(80) NOT NULL,
  "sport_key" varchar(80) NOT NULL,
  "sport_title" varchar(80) NOT NULL,
  "home_team" varchar(120) NOT NULL,
  "away_team" varchar(120) NOT NULL,
  "commence_time" timestamptz NOT NULL,
  "selection" varchar(16) NOT NULL,
  "result" varchar(16) DEFAULT 'pending' NOT NULL,
  "home_score" integer,
  "away_score" integer,
  "settled_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "picks_user_event" ON "picks" ("user_id", "event_id");
