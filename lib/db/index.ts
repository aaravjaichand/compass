import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazily-initialized Drizzle client over Neon's HTTP driver. Lazy so that
 * importing this module never throws at build time when DATABASE_URL is absent
 * (the connection is only needed at request time on a Node runtime).
 */
let client: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set — configure Neon (see .env.example).",
      );
    }
    client = drizzle(neon(url), { schema });
  }
  return client;
}

export { schema };
