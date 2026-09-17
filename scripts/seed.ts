/**
 * Seed demo data (KIT demo-data.json) plus a few demo appointments so the
 * admin calendar is not empty. Refuses to run on a database that already has
 * settings — reseeding production would be a disaster.
 *
 * Staff passwords: SEED_OWNER_PASSWORD / SEED_MANAGER_PASSWORD /
 * SEED_THERAPIST_PASSWORD, otherwise random ones are generated and written
 * to data/demo-credentials.txt (git-ignored).
 */
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../src/lib/db";
import { seedDemo } from "../src/lib/seed-data";
import { approveAppointment, createHold, getAvailability, submitAppointment, todayLocal } from "../src/lib/scheduling";
import { addDays } from "../src/lib/time";

const db = await getDb();
const existing = await db.select().from(schema.businessSettings).where(eq(schema.businessSettings.id, 1));
if (existing.length) {
  console.error("Database already seeded. Delete data/pgdata (dev only) to start over.");
  process.exit(1);
}

const { credentials } = await seedDemo(db, {
  passwords: {
    owner: process.env.SEED_OWNER_PASSWORD,
    manager: process.env.SEED_MANAGER_PASSWORD,
    therapist: process.env.SEED_THERAPIST_PASSWORD,
  },
});

// Demo appointments on the next working day with free slots.
const tz = "Europe/Berlin";
let date = addDays(todayLocal(tz), 1);
for (let i = 0; i < 7; i++) {
  const facial = await getAvailability(db, { serviceId: "gesichtspflege", variantId: "60", from: date });
  const massage = await getAvailability(db, { serviceId: "aroma-massage", variantId: "60", from: date });
  const f = facial.days[0].slots.find((s) => s.time === "11:30") ?? facial.days[0].slots[2];
  const m = massage.days[0].slots.find((s) => s.time === "14:00") ?? massage.days[0].slots[3];
  if (f && m) {
    const h1 = await createHold(db, { serviceId: "gesichtspflege", variantId: "60", date, time: f.time });
    await submitAppointment(db, { holdToken: h1.holdToken, name: "Demo-Kundin01", email: "demo-kundin01@example.invalid", locale: "de", note: "Demo: ruhige Behandlung gewünscht." });
    const h2 = await createHold(db, { serviceId: "aroma-massage", variantId: "60", date, time: m.time });
    const r2 = await submitAppointment(db, { holdToken: h2.holdToken, name: "Demo-Kundin02", email: "demo-kundin02@example.invalid", locale: "de" });
    await approveAppointment(db, r2.appointmentId, "seed");
    await db.update(schema.customers).set({ isDemo: true });
    await db.update(schema.appointments).set({ isDemo: true });
    console.log(`Demo appointments on ${date}.`);
    break;
  }
  date = addDays(date, 1);
}

const file = path.resolve("data", "demo-credentials.txt");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(
  file,
  `HPHUONG admin demo accounts (local only)\n\n${credentials.map((c) => `${c.role.padEnd(10)} ${c.email.padEnd(28)} ${c.password}`).join("\n")}\n`,
);
console.log(`Seeded. Admin logins written to ${file}`);
process.exit(0);
