/**
 * Bring an EXISTING database up to the studio's flyer data (src/lib/flyer-data.ts):
 * contact data, opening hours, the 9 treatment groups and all 67 price rows.
 *
 *   npm run db:push        # once, adds the columns of drizzle/0002_flyer_catalog.sql
 *   npm run catalog:sync
 *
 * Idempotent. Overwrites: studio contact fields, opening-hour rules, demo staff shifts,
 * and name/texts/prices/durations of the flyer's services (edits made to them in the admin
 * panel are replaced by the flyer values). Services and packages that are not on the flyer
 * are hidden, not deleted. Appointments, vouchers, customers, logins and messages are not
 * touched. PGlite: stop `npm run dev` first (one process per data directory).
 */
import { getDb } from "../src/lib/db";
import { getSettings } from "../src/lib/catalog";
import { applyFlyer } from "../src/lib/seed-data";

const db = await getDb();
await getSettings(db); // fails with a clear message on an unseeded database
const result = await db.transaction((tx) => applyFlyer(tx));
console.log(`Catalog synced: ${result.services} services, ${result.variants} price rows (${result.bookableVariants} bookable online).`);
if (result.hiddenServices.length) console.log(`Hidden (not on the flyer): ${result.hiddenServices.join(", ")}`);
if (result.deactivatedOffers.length) console.log(`Packages switched off: ${result.deactivatedOffers.join(", ")}`);
process.exit(0);
