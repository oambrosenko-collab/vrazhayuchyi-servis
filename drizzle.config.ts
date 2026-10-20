import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Introspection and type-checking only.
 *
 * Schema changes are authored as SQL in `supabase/migrations`, because RLS
 * policies, security-definer functions and grants have no Drizzle
 * equivalent — and those are exactly the parts that need line-by-line
 * review. Use `drizzle-kit check` to confirm src/db/schema.ts still matches
 * the database; never `drizzle-kit push`.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
