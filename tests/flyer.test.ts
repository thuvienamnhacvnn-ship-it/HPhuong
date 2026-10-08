/**
 * The real catalog: studio data and price list from the flyers (src/lib/flyer-data.ts),
 * seeded with seedDemo / synced with applyFlyer. Expected numbers are typed in here from
 * `_w-agent/20_flyer-du-lieu.md`, not derived from flyer-data.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createMemoryDb, schema } from "../src/lib/db";
import { applyFlyer, seedDemo } from "../src/lib/seed-data";
import { bookableVariants, getService, getSettings, isBookableOnline, listOffers, listServices, quote } from "../src/lib/catalog";
import { CATEGORIES } from "../src/lib/categories";
import { FEATURED_SERVICE_ID } from "../src/lib/flyer-data";
import { createHold, getAvailability, submitAppointment } from "../src/lib/scheduling";
import { runTool, type Card } from "../src/lib/assistant/tools";
import { choose } from "../src/lib/assistant";
import { formatServicePrice, formatSnapshotPrice } from "../src/lib/money";
import { renderAppointment } from "../src/lib/notifications/templates";
import { telHref, waHref } from "../src/lib/contact";
import { DomainError } from "../src/lib/errors";
import { seedKitFixture } from "./fixture";
import { NOW, TUESDAY, contact } from "./helpers";

const SATURDAY = "2026-10-24";
const SUNDAY = "2026-10-25";

async function flyerDb() {
  const db = await createMemoryDb();
  await seedDemo(db, { passwords: { owner: "owner-test-pass", manager: "manager-test-pass", therapist: "therapist-test-pass" } });
  return db;
}

test("the catalog has the flyer's 9 groups, 67 price rows, 25 of them bookable online", async () => {
  const db = await flyerDb();
  const services = await listServices(db);
  const rows = services.flatMap((s) => s.variants.map((v) => ({ s, v })));
  assert.equal(rows.length, 67);
  assert.equal(services.flatMap((s) => bookableVariants(s)).length, 25);
  assert.equal(rows.filter(({ v }) => v.minutes === null).length, 42);
  assert.equal(rows.filter(({ v }) => v.priceFrom).length, 17, "rows printed with 'ab'");

  const perGroup = Object.fromEntries(CATEGORIES.map((c) => [c, rows.filter(({ s }) => s.category === c).length]));
  assert.deepEqual(perGroup, {
    "gesicht-pflege": 6,
    "spezial-koerper": 8,
    "entspannung-sugaring": 11,
    "massage-wellness": 9,
    manikuere: 5,
    pedikuere: 5,
    nageldesign: 11,
    wimpernverlaengerung: 7,
    augenkosmetik: 5,
  });
  assert.ok(services.every((s) => (CATEGORIES as readonly string[]).includes(s.category)), "no service outside the nine groups");
  assert.ok(services.every((s) => !s.isDemo), "flyer prices are real prices, not demo prices");
  assert.ok(!services.some((s) => /head.?spa|aroma/i.test(`${s.id} ${s.name.de}`)), "old demo services are gone");
  assert.equal((await listOffers(db)).length, 0, "the demo package is gone");
});

test("spot checks against the flyer: prices, durations, 'ab'", async () => {
  const db = await flyerDb();
  const row = async (serviceId: string, variantId: string) => {
    const s = await getService(db, serviceId);
    const v = s?.variants.find((x) => x.id === variantId);
    assert.ok(v, `${serviceId}/${variantId} exists`);
    return [v.minutes, v.priceCents, v.priceFrom] as const;
  };
  assert.deepEqual(await row("basis-kosmetik", "60"), [60, 5000, false]);
  assert.deepEqual(await row("anti-age-behandlung", "105"), [105, 9500, false]);
  assert.deepEqual(await row("lomi-lomi-nui-massage", "80"), [80, 8000, false]);
  assert.deepEqual(await row("schulter-nackenmassage", "20"), [20, 2500, false]);
  assert.deepEqual(await row("klassische-fusspflege", "45"), [45, 3000, true]);
  assert.deepEqual(await row("spa-manikuere", "45"), [45, 2800, false]);
  assert.deepEqual(await row("bodyfit-monthalit", "mineral-sole-schlick"), [60, 4500, false]);
  assert.deepEqual(await row("aknebehandlung", "gesicht-dekollete"), [null, 4000, true]);
  assert.deepEqual(await row("sugaring", "beine-komplett"), [null, 4800, false]);
  assert.deepEqual(await row("neumodellage", "french-ombre-farbe"), [null, 3700, true]);
  assert.deepEqual(await row("wimpernverlaengerung", "neuanlage-volume"), [null, 9000, false]);
  assert.deepEqual(await row("extras", "wirkstoffampulle-serum"), [null, 700, true]);
  // The two durations that only the PDF has are NOT used.
  assert.deepEqual(await row("klassische-manikuere", "std"), [null, 1800, false]);
  assert.deepEqual(await row("aknebehandlung", "gesicht"), [null, 3500, false]);

  const basis = (await getService(db, "basis-kosmetik"))!;
  assert.equal(basis.name.de, "Basis-Kosmetik");
  assert.equal(basis.teaser.de, "Professionelle Gesichtspflege");
  assert.equal(basis.steps.de.length, 9);
  assert.equal(basis.steps.en.length, 9);
  assert.deepEqual(basis.preparation, { de: [], en: [] }, "the flyer has no preparation notes — nothing was written");
});

test("starting prices read 'ab 25,00 €' / 'from €25.00' everywhere a price is formatted", async () => {
  const db = await flyerDb();
  assert.equal(formatServicePrice(2500, "de", true).replace(/ /g, " "), "ab 25,00 €");
  assert.equal(formatServicePrice(2500, "en", true), "from €25.00");
  assert.equal(formatServicePrice(5000, "de").replace(/ /g, " "), "50,00 €");

  const q = await quote(db, { serviceId: "klassische-fusspflege", variantId: "45" });
  assert.equal(q.priceFrom, true);
  assert.equal(q.totalCents, 3000);

  // booking keeps the flag in the snapshot, so the e-mail says "ab" too
  const hold = await createHold(db, { serviceId: "klassische-fusspflege", variantId: "45", date: TUESDAY, time: "10:00" }, NOW);
  const res = await submitAppointment(db, { ...contact(), holdToken: hold.holdToken }, NOW);
  const [appointment] = await db.select().from(schema.appointments);
  const [customer] = await db.select().from(schema.customers);
  assert.equal(appointment.id, res.appointmentId);
  assert.equal(formatSnapshotPrice(appointment.snapshot, "de").replace(/ /g, " "), "ab 30,00 €");
  const mail = renderAppointment("appointment_request_received", appointment, customer, await getSettings(db));
  assert.match(mail.text.replace(/ /g, " "), /ab 30,00 €/);
  assert.match(mail.text, /Kolonnenstraße 33, 10829 Berlin/);
  assert.match(mail.text, /0174 905 05 19/);
});

test("rows without a duration cannot be booked online — hold, availability and quote all refuse", async () => {
  const db = await flyerDb();
  const notBookable = (e: DomainError) => e.code === "service_not_bookable";
  for (const [serviceId, variantId] of [
    ["klassische-manikuere", "std"],
    ["aknebehandlung", "gesicht"],
    ["sugaring", "achseln"],
    ["neumodellage", "natur"],
    ["extras", "fuss-handmassage"],
  ]) {
    await assert.rejects(createHold(db, { serviceId, variantId, date: TUESDAY, time: "10:00" }, NOW), notBookable, `${serviceId}/${variantId} hold`);
    await assert.rejects(getAvailability(db, { serviceId, variantId, from: TUESDAY }, NOW), notBookable, `${serviceId}/${variantId} availability`);
    const q = await quote(db, { serviceId, variantId });
    assert.equal(q.bookingMode, "not_bookable");
    assert.equal(q.treatmentMinutes, null);
  }
  assert.equal((await db.select().from(schema.resourceAllocations)).length, 0);
  // "online only" lists never contain a service without a timed row
  const online = await listServices(db, { bookableOnly: true });
  assert.ok(online.every(isBookableOnline));
  assert.ok(!online.some((s) => ["sugaring", "aknebehandlung", "extras", "shellac"].includes(s.id)));
});

test("opening hours: Mo–Fr 9:30–18:30, no online slots on Saturday or Sunday", async () => {
  const db = await flyerDb();
  const week = await getAvailability(db, { serviceId: "basis-kosmetik", variantId: "60", from: TUESDAY, days: 6 }, NOW);
  const byDate = Object.fromEntries(week.days.map((d) => [d.date, d]));
  const tuesday = byDate[TUESDAY].slots.map((s) => s.time);
  assert.equal(tuesday[0], "09:30", "first slot of the day");
  assert.ok(tuesday.every((t) => t >= "09:30" && t <= "17:30"), "a 60-minute treatment ends by 18:30");
  assert.equal(byDate[SATURDAY].slots.length, 0, "Saturday is by appointment only — no online slots");
  assert.equal(byDate[SUNDAY].slots.length, 0);
  await assert.rejects(createHold(db, { serviceId: "basis-kosmetik", variantId: "60", date: SATURDAY, time: "10:00" }, NOW), (e: DomainError) => e.code === "slot_unavailable");

  const rules = (await db.select().from(schema.availabilityRules)).filter((r) => r.resourceId === null);
  assert.deepEqual(rules.map((r) => `${r.weekday} ${r.startTime}-${r.endTime}`).sort(), [1, 2, 3, 4, 5].map((d) => `${d} 09:30-18:30`));
  const settings = await getSettings(db);
  assert.deepEqual(settings.hoursNotes, { "6": { de: "nach Vereinbarung", en: "by appointment" } });
});

test("studio contact data from the flyer, with working tel:/WhatsApp links", async () => {
  const db = await flyerDb();
  const s = await getSettings(db);
  assert.equal(s.brand, "HPHUONG Kosmetik & Spa");
  assert.equal(s.address, "Kolonnenstraße 33, 10829 Berlin");
  assert.equal(s.phone, "030 78 71 29 51");
  assert.equal(s.mobilePhone, "0174 905 05 19");
  assert.equal(s.email, "beautymore.hoang@icloud.com");
  assert.ok(s.mapUrl?.startsWith("https://www.google.com/maps/search/"));
  assert.equal(decodeURIComponent(new URL(s.mapUrl!).searchParams.get("query")!), "Kolonnenstraße 33, 10829 Berlin");
  assert.equal(telHref(s.phone!), "tel:+493078712951");
  assert.equal(waHref(s.mobilePhone!), "https://wa.me/491749050519");
  // site-wide demo switches stay as they were: launching is the owner's decision
  assert.equal(s.isDemo, true);
  assert.equal(s.publicLaunchEnabled, false);
  assert.equal(s.paymentMode, "sandbox");
});

test("a treatment with several timed rows books the chosen row under its full name", async () => {
  const db = await flyerDb();
  const hold = await createHold(db, { serviceId: "bodyfit-monthalit", variantId: "entschlackungswickel", date: TUESDAY, time: "11:00" }, NOW);
  await submitAppointment(db, { ...contact(), holdToken: hold.holdToken }, NOW);
  const [appointment] = await db.select().from(schema.appointments);
  const seg = appointment.snapshot.segments[0];
  assert.equal(seg.name.de, "Bodyfit mit Monthalit – Entschlackungswickel");
  assert.equal(seg.minutes, 50);
  assert.equal(seg.priceCents, 4000);
  assert.equal(appointment.snapshot.totalMinutes, 50);
});

test("home page card: Basis-Kosmetik, 60 minutes, 50,00 €, bookable", async () => {
  const db = await flyerDb();
  const featured = (await listServices(db, { bookableOnly: true })).find((s) => s.id === FEATURED_SERVICE_ID)!;
  const v = bookableVariants(featured)[0];
  assert.equal(featured.name.de, "Basis-Kosmetik");
  assert.deepEqual([v.id, v.minutes, v.priceCents], ["60", 60, 5000]);
  assert.equal(featured.imageAssetId, "service-facial");
});

test("assistant: real prices, 'ab' flagged, phone-only rows are never proposed for online booking", async () => {
  const db = await flyerDb();
  const cards: Card[] = [];
  const found = (await runTool(db, "search_services", { category: "entspannung-sugaring" }, "de", cards, NOW)) as {
    note: string;
    studioContact: { phone: string; mobileAndWhatsApp: string };
    services: { serviceId: string; variants: { variantId: string; minutes: number | null; priceCents: number; priceFrom: boolean; onlineBookable: boolean; howToBook?: string }[] }[];
  };
  assert.doesNotMatch(found.note, /demo/i);
  assert.deepEqual(found.studioContact, { phone: "030 78 71 29 51", mobileAndWhatsApp: "0174 905 05 19" });
  const sugaring = found.services.find((s) => s.serviceId === "sugaring")!;
  assert.equal(sugaring.variants.length, 8);
  assert.ok(sugaring.variants.every((v) => v.minutes === null && !v.onlineBookable && v.howToBook === "by phone or WhatsApp"));
  assert.equal(sugaring.variants.find((v) => v.variantId === "brust")!.priceFrom, true);
  const kopf = found.services.find((s) => s.serviceId === "bio-release-kopfmassage")!;
  assert.deepEqual(kopf.variants.map((v) => [v.minutes, v.priceCents, v.onlineBookable]), [[60, 5000, true]]);

  const refused = (await runTool(db, "propose_booking", { serviceId: "sugaring", variantId: "brust", reason: "x", withinBudget: null }, "de", cards, NOW)) as { error: string };
  assert.equal(refused.error, "not_bookable_online");
  assert.equal(cards.length, 0);
  const ok = (await runTool(db, "propose_booking", { serviceId: "klassische-fusspflege", variantId: "45", reason: "Für die Füße", withinBudget: true }, "de", cards, NOW)) as { shownPriceCents: number; shownPriceIsStartingPrice: boolean };
  assert.deepEqual([ok.shownPriceCents, ok.shownPriceIsStartingPrice], [3000, true]);
  assert.equal(cards[0].priceFrom, true);

  // the rule-based chooser only offers rows that can be booked online
  const relax = await choose(db, { goal: "entspannung", budgetCents: 5000, maxMinutes: 60 });
  assert.ok(relax.within.length > 0);
  assert.ok(relax.within.every((c) => c.priceCents <= 5000 && c.minutes <= 60));
  const feet = await choose(db, { goal: "fuesse" });
  assert.deepEqual(feet.within.map((c) => c.serviceId).sort(), ["fussmassage-pflegepackung", "klassische-fusspflege", "spa-pedikuere"]);
});

test("catalog:sync on a database with the old demo data: flyer catalog in, demo services hidden, nothing deleted, repeatable", async () => {
  const db = await createMemoryDb();
  await seedKitFixture(db);
  const before = await db.select().from(schema.services);
  const first = await applyFlyer(db);
  assert.deepEqual([first.services, first.variants, first.bookableVariants], [43, 67, 25]);
  assert.deepEqual(first.hiddenServices.sort(), ["aroma-massage", "gesichtspflege", "head-spa", "wellness-fusspflege"]);
  assert.deepEqual(first.deactivatedOffers, ["pflege-ruhe"]);
  const second = await applyFlyer(db); // idempotent
  assert.deepEqual([second.services, second.variants], [43, 67]);

  const all = await db.select().from(schema.services);
  assert.equal(all.length, before.length + 43, "old rows are kept (appointments point at them)");
  const visible = await listServices(db);
  assert.equal(visible.flatMap((s) => s.variants).length, 67);
  assert.ok(!visible.some((s) => before.some((b) => b.id === s.id)));
  assert.equal(await getService(db, "head-spa"), null, "hidden from the public site");
  assert.equal((await listOffers(db)).length, 0);
  assert.equal((await db.select().from(schema.resources)).find((r) => r.type === "headspa-basin")?.active, false);

  const tuesday = await getAvailability(db, { serviceId: "basis-kosmetik", variantId: "60", from: TUESDAY }, NOW);
  assert.equal(tuesday.days[0].slots[0].time, "09:30");
  const saturday = await getAvailability(db, { serviceId: "basis-kosmetik", variantId: "60", from: SATURDAY }, NOW);
  assert.equal(saturday.days[0].slots.length, 0);
  await assert.rejects(createHold(db, { serviceId: "head-spa", variantId: "45", date: TUESDAY, time: "11:00" }, NOW), (e: DomainError) => e.code === "service_not_found");
});
