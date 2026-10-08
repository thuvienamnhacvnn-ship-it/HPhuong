/**
 * Runs in the Vercel build, before `next build`: brings the deployment's Postgres up to the code
 * that is about to go live — pending files of drizzle/ first, then the studio's price list
 * (src/lib/flyer-data.ts) through the same applyFlyer() that `npm run catalog:sync` uses.
 *
 * Both steps are idempotent. If either fails the build fails and the previous deployment stays
 * live. Without DATABASE_URL (local builds, PGlite) nothing happens here: locally use
 * `npm run db:push` and `npm run catalog:sync`.
 */
export {};

if (!process.env.DATABASE_URL) {
  console.log("deploy-db: no DATABASE_URL — skipped.");
  process.exit(0);
}

const { applyMigrations, getDb } = await import("../src/lib/db");
const { getSettings } = await import("../src/lib/catalog");
const { applyFlyer } = await import("../src/lib/seed-data");

const db = await getDb();
await applyMigrations(db);
await getSettings(db); // fails with a clear message on an unseeded database
const result = await db.transaction((tx) => applyFlyer(tx));
console.log(`deploy-db: migrations up to date; catalog synced (${result.services} services, ${result.variants} price rows, ${result.bookableVariants} bookable online).`);
if (result.hiddenServices.length) console.log(`deploy-db: hidden (not on the price list): ${result.hiddenServices.join(", ")}`);
process.exit(0);
