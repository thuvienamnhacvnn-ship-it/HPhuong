/**
 * Apply SQL migrations in drizzle/ to the database (PGlite locally, Postgres
 * when DATABASE_URL is set). `drizzle-kit push` needs TCP, which PGlite does
 * not offer — so we run the generated SQL files ourselves, the same files
 * production runs.
 *
 *   npm run db:generate   # after editing src/lib/db/schema.ts
 *   npm run db:push
 */
import { applyMigrations, getDb } from "../src/lib/db";

const db = await getDb();
await applyMigrations(db);
console.log("Migrations up to date.");
process.exit(0);
