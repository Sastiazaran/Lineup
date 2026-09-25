CREATE TABLE IF NOT EXISTS "league_spread_prefs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sport_key" varchar(80) NOT NULL,
  "spreads_enabled" boolean DEFAULT true NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "league_spread_prefs_user_sport"
  ON "league_spread_prefs" ("user_id", "sport_key");
