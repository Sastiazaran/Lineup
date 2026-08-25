CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(320) NOT NULL UNIQUE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "unsubscribed_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "magic_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sport_key" varchar(80) NOT NULL,
  "team_name" varchar(120) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_sport_team"
  ON "favorites" ("user_id", "sport_key", "team_name");

CREATE TABLE IF NOT EXISTS "email_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sent_at" timestamptz DEFAULT now() NOT NULL,
  "pick_team" varchar(120),
  "event_id" varchar(80)
);
