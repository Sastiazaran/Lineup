import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { EnvKey } from "@/lib/constants";
import { requireEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cached: Database | null = null;

/**
 * Lazy Neon HTTP client so `next build` does not connect at import time.
 */
export function getDb(): Database {
  if (!cached) {
    const sql = neon(requireEnv(EnvKey.DatabaseUrl));
    cached = drizzle(sql, { schema });
  }
  return cached;
}
