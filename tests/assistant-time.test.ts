import { test } from "node:test";
import assert from "node:assert/strict";
import { runTool, type Card } from "../src/lib/assistant/tools";
import { choose, needsHandoff, redact } from "../src/lib/assistant";
import { schema } from "../src/lib/db";
import { zonedToUtc, toLocalParts } from "../src/lib/time";
import { NOW, testDb } from "./helpers";

test("assistant cards take price and duration from the database, never from the model", async () => {
  const db = await testDb();
  const cards: Card[] = [];
  const out = (await runTool(db, "propose_booking", { serviceId: "head-spa", variantId: "45", reason: "Zum Abschalten", withinBudget: true }, "de", cards, NOW)) as { shownPriceCents: number };
  assert.equal(out.shownPriceCents, 5900);
  assert.equal(cards[0].priceCents, 5900);
  const bad = (await runTool(db, "propose_booking", { serviceId: "botox-deluxe", variantId: "60", reason: "x", withinBudget: true }, "de", cards, NOW)) as { error: string };
  assert.equal(bad.error, "unknown_service_or_variant");
  assert.equal(cards.length, 1);
  await assert.rejects(runTool(db, "propose_booking", { serviceId: "head-spa", variantId: "45", reason: "x", withinBudget: true, priceCents: 1 }, "de", cards, NOW));
});

test("assistant tools cannot write: availability is read-only", async () => {
  const db = await testDb();
  const res = (await runTool(db, "get_availability", { serviceId: "gesichtspflege", variantId: "60", fromDate: "2026-10-20", days: 1 }, "de", [], NOW)) as { days: { times: string[] }[] };
  assert.ok(res.days[0].times.length > 0);
  assert.equal((await db.select().from(schema.resourceAllocations)).length, 0);
  assert.equal((await db.select().from(schema.appointments)).length, 0);
});

test("rule-based chooser is honest about budget", async () => {
  const db = await testDb();
  const r = await choose(db, { goal: "entspannung", budgetCents: 8000, maxMinutes: null });
  assert.ok(r.within.every((c) => c.priceCents <= 8000));
  const tight = await choose(db, { goal: "gesicht", budgetCents: 3000 });
  assert.equal(tight.within.length, 0);
  assert.ok(tight.aboveBudget.every((c) => c.withinBudget === false && c.priceCents > 3000));
});

test("health questions are handed to people and PII is removed before the model", () => {
  assert.ok(needsHandoff("Ich bin schwanger, ist Massage ok?"));
  assert.ok(!needsHandoff("Ich möchte mich entspannen, bis 80 €"));
  assert.equal(redact("mail a@b.de oder +49 170 1234567"), "mail [E-Mail entfernt] oder [Nummer entfernt]");
});

test("Europe/Berlin conversions survive daylight-saving changes", () => {
  assert.equal(zonedToUtc("2026-03-29", "02:30", "Europe/Berlin"), null, "spring-forward gap does not exist");
  assert.equal(zonedToUtc("2026-03-29", "03:30", "Europe/Berlin")!.toISOString(), "2026-03-29T01:30:00.000Z");
  assert.equal(zonedToUtc("2026-10-25", "02:30", "Europe/Berlin")!.toISOString(), "2026-10-25T00:30:00.000Z", "ambiguous time → summer-time instant");
  assert.equal(zonedToUtc("2026-10-26", "10:00", "Europe/Berlin")!.toISOString(), "2026-10-26T09:00:00.000Z");
  assert.equal(zonedToUtc("2026-10-21", "11:30", "Europe/Berlin")!.toISOString(), "2026-10-21T09:30:00.000Z");
  assert.deepEqual(toLocalParts(new Date("2026-10-25T01:30:00Z"), "Europe/Berlin").time, "02:30");
});
