import { defineConfig } from "drizzle-kit";

// drizzle-kit is a separate CLI and does not load Next's .env.local. Run the
// db:* scripts with DATABASE_URL in the environment, e.g.
//   export $(grep -v '^#' .env.local | xargs) && npm run db:push
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
