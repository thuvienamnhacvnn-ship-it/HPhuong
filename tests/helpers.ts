import { createMemoryDb, schema } from "../src/lib/db";
import { seedDemo } from "../src/lib/seed-data";
import { zonedToUtc } from "../src/lib/time";

/** Monday 19 Oct 2026, 08:00 Berlin. Tuesday the 20th is a normal working day for both staff. */
export const NOW = zonedToUtc("2026-10-19", "08:00", "Europe/Berlin")!;
export const TUESDAY = "2026-10-20";

export async function testDb() {
  const db = await createMemoryDb();
  await seedDemo(db, { passwords: { owner: "owner-test-pass", manager: "manager-test-pass", therapist: "therapist-test-pass" } });
  return db;
}

export const berlin = (date: string, time: string) => zonedToUtc(date, time, "Europe/Berlin")!;

export async function blockResource(db: Awaited<ReturnType<typeof testDb>>, resourceId: string | null, date: string, from: string, to: string) {
  await db.insert(schema.timeOff).values({ id: `off-${Math.random().toString(36).slice(2)}`, resourceId, startsAt: berlin(date, from), endsAt: berlin(date, to), reason: "test" });
}

export const contact = (over: Record<string, unknown> = {}) => ({
  name: "Test Kundin",
  email: "kundin@example.invalid",
  phone: null as string | null,
  whatsappReminder: false,
  note: null,
  locale: "de" as const,
  ...over,
});
