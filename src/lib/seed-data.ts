/**
 * Seed + catalog sync.
 *
 * - Studio contact data, opening hours and the whole price list come from the studio's
 *   flyers (`flyer-data.ts`) — real data, not flagged demo.
 * - Staff ("Mitarbeitende A/B"), rooms, shifts, buffers, staff logins and the legal pages
 *   are still demo placeholders (`is_demo`); the site-wide demo switch stays on until the
 *   owner launches.
 *
 * `applyFlyer` is idempotent: a fresh seed calls it, and `npm run catalog:sync` runs it
 * against an existing database (local PGlite or Postgres) without touching appointments,
 * vouchers, customers or logins.
 */
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";
import type { Db, DbOrTx } from "./db";
import { schema } from "./db";
import { hashPassword } from "./ids";
import { FLYER_SCHEDULING_DEFAULTS, FLYER_SERVICES, FLYER_STUDIO, ROOM_TYPES } from "./flyer-data";

const ASSETS: (typeof schema.assets.$inferInsert)[] = [
  { id: "logo-medallion", source: "assets/brand/logo-medallion.png", width: 1254, height: 1254, alt: { de: "HPHUONG Logo", en: "HPHUONG logo" }, isConcept: false },
  { id: "logo-original", source: "assets/brand/logo-original.png", width: 1254, height: 1254, alt: { de: "HPHUONG Logo", en: "HPHUONG logo" }, isConcept: false },
  { id: "decor-lily", source: "assets/images/decor-lily.png", width: 1254, height: 1254, alt: { de: "", en: "" } },
  { id: "gift-card-blank", source: "assets/images/gift-card-blank.png", width: 1536, height: 1024, alt: { de: "Gutscheinkarte", en: "Gift card" } },
  { id: "hero-desktop", source: "assets/images/hero-desktop.png", width: 1448, height: 1086, alt: { de: "Entspannende Gesichtsbehandlung", en: "Relaxing facial treatment" } },
  { id: "hero-mobile", source: "assets/images/hero-mobile.png", width: 1040, height: 1086, alt: { de: "Entspannende Gesichtsbehandlung", en: "Relaxing facial treatment" } },
  { id: "ritual-still-life", source: "assets/images/ritual-still-life.png", width: 1536, height: 1024, alt: { de: "Pflegeöl, Handtücher und Lilie", en: "Care oil, towels and lily" } },
  { id: "service-facial", source: "assets/images/service-facial.png", width: 1122, height: 1402, alt: { de: "Gesichtsbehandlung", en: "Facial treatment" } },
  { id: "service-footcare", source: "assets/images/service-footcare.png", width: 1122, height: 1402, alt: { de: "Fußpflege", en: "Foot care" } },
  { id: "service-massage", source: "assets/images/service-massage.png", width: 1122, height: 1402, alt: { de: "Massage", en: "Massage" } },
  { id: "service-brows", source: "assets/images/service-brows.png", width: 1122, height: 1402, alt: { de: "Augenbrauen werden geformt und gefärbt", en: "Eyebrows being shaped and tinted" } },
  { id: "service-nails", source: "assets/images/service-nails.png", width: 1122, height: 1402, alt: { de: "Gepflegte Hände mit French-Nägeln", en: "Well-groomed hands with French nails" } },
  { id: "service-manicure", source: "assets/images/service-manicure.png", width: 1122, height: 1402, alt: { de: "Handpflege mit Handbad", en: "Hand care with a hand bath" } },
  { id: "service-sugaring", source: "assets/images/service-sugaring.png", width: 1122, height: 1402, alt: { de: "Sugaring mit Zuckerpaste am Bein", en: "Sugaring with sugar paste on the leg" } },
  { id: "service-headmassage", source: "assets/images/service-headmassage.png", width: 1122, height: 1402, alt: { de: "Kopfmassage", en: "Head massage" } },
  { id: "service-acupressure", source: "assets/images/service-acupressure.png", width: 1122, height: 1402, alt: { de: "Sanfte Akupressur im Gesicht", en: "Gentle facial acupressure" } },
  { id: "service-serum", source: "assets/images/service-serum.png", width: 1122, height: 1402, alt: { de: "Gesichtspflege mit Wirkstoffserum", en: "Facial care with active serum" } },
  { id: "service-antiage", source: "assets/images/service-antiage.png", width: 1122, height: 1402, alt: { de: "Gesichtsmaske wird aufgetragen", en: "Face mask being applied" } },
  { id: "service-eyecare", source: "assets/images/service-eyecare.png", width: 1122, height: 1402, alt: { de: "Pflege der Augenpartie mit Augenpads", en: "Eye-area care with eye pads" } },
  { id: "service-cleansing", source: "assets/images/service-cleansing.png", width: 1122, height: 1402, alt: { de: "Reinigung des Gesichts mit Bedampfung", en: "Facial cleansing with steam" } },
  { id: "service-bodywrap", source: "assets/images/service-bodywrap.png", width: 1122, height: 1402, alt: { de: "Körperbehandlung mit Mineralschlick", en: "Body treatment with mineral mud" } },
  { id: "service-hotstone", source: "assets/images/service-hotstone.png", width: 1122, height: 1402, alt: { de: "Hot-Stone-Massage", en: "Hot stone massage" } },
  { id: "service-ayurveda", source: "assets/images/service-ayurveda.png", width: 1122, height: 1402, alt: { de: "Massage mit warmem Öl", en: "Massage with warm oil" } },
  { id: "service-footreflex", source: "assets/images/service-footreflex.png", width: 1122, height: 1402, alt: { de: "Fußreflexzonenmassage", en: "Foot reflexology massage" } },
  { id: "service-shoulder", source: "assets/images/service-shoulder.png", width: 1122, height: 1402, alt: { de: "Schulter- und Nackenmassage", en: "Shoulder and neck massage" } },
  { id: "service-facial-massage", source: "assets/images/service-facial-massage.png", width: 1122, height: 1402, alt: { de: "Gesichtsmassage", en: "Facial massage" } },
  { id: "service-lashes", source: "assets/images/service-lashes.png", width: 1122, height: 1402, alt: { de: "Wimpernverlängerung", en: "Eyelash extensions" } },
  { id: "offer-banner", source: "assets/images/offer-banner.png", width: 1536, height: 1024, alt: { de: "Geschenkbox, Lilien und Kerzen", en: "Gift box, lilies and candles" } },
  { id: "studio-interior", source: "assets/images/studio-interior.png", width: 1660, height: 948, alt: { de: "Raumvisualisierung eines Behandlungsraums", en: "Visualisation of a treatment room" } },
];

/** Demo staff shifts inside the flyer's opening hours (Mo–Fr 9:30–18:30, no Saturday slots). */
const DEMO_SHIFTS: Record<string, { days: number[]; start: string; end: string }> = {
  "team-a": { days: [1, 2, 3, 4, 5], start: FLYER_STUDIO.open, end: FLYER_STUDIO.close },
  "team-b": { days: [2, 3, 4, 5], start: "10:00", end: FLYER_STUDIO.close },
};

export type FlyerSyncResult = { services: number; variants: number; bookableVariants: number; hiddenServices: string[]; deactivatedOffers: string[] };

/** Write studio data, opening hours and the 67-row price list from flyer-data.ts. Safe to run repeatedly. */
export async function applyFlyer(db: DbOrTx): Promise<FlyerSyncResult> {
  /* studio */
  await db
    .update(schema.businessSettings)
    .set({
      brand: FLYER_STUDIO.brand,
      address: FLYER_STUDIO.address,
      phone: FLYER_STUDIO.phone,
      mobilePhone: FLYER_STUDIO.mobilePhone,
      email: FLYER_STUDIO.email,
      mapUrl: FLYER_STUDIO.mapUrl,
      hoursNotes: FLYER_STUDIO.hoursNotes,
      updatedAt: new Date(),
    })
    .where(eq(schema.businessSettings.id, 1));

  /* pictures used by the catalog (rows may be missing in an older database) */
  const used = new Set(FLYER_SERVICES.map((s) => s.image).filter((x): x is string => !!x));
  for (const asset of ASSETS.filter((a) => used.has(a.id))) {
    await db.insert(schema.assets).values(asset).onConflictDoUpdate({ target: schema.assets.id, set: { alt: asset.alt } });
  }

  /* services + price rows */
  let variantCount = 0;
  let bookableCount = 0;
  for (const [index, s] of FLYER_SERVICES.entries()) {
    const timed = s.variants.some((v) => v.minutes !== null);
    const row = {
      category: s.category,
      name: s.name,
      teaser: s.teaser ?? { de: "", en: "" },
      description: s.description ?? { de: "", en: "" },
      steps: s.steps ?? { de: [], en: [] },
      preparation: { de: [], en: [] }, // the flyer has no preparation notes — the block stays hidden
      contentApproved: true,
      imageAssetId: s.image ?? null,
      roomTypes: ROOM_TYPES[s.room],
      equipmentTypes: [],
      bookable: timed && !s.addon,
      isAddon: !!s.addon,
      visible: true,
      sortOrder: index,
      isDemo: false,
    };
    await db
      .insert(schema.services)
      .values({ id: s.id, ...row, videoUrl: null, ...FLYER_SCHEDULING_DEFAULTS })
      .onConflictDoUpdate({ target: schema.services.id, set: row });

    for (const [order, v] of s.variants.entries()) {
      const vrow = { label: v.label ?? null, minutes: v.minutes, priceCents: v.priceCents, priceFrom: !!v.from, sortOrder: order, active: true };
      await db
        .insert(schema.serviceVariants)
        .values({ serviceId: s.id, id: v.id, ...vrow })
        .onConflictDoUpdate({ target: [schema.serviceVariants.serviceId, schema.serviceVariants.id], set: vrow });
      variantCount++;
      if (v.minutes !== null && !s.addon) bookableCount++;
    }
    // price rows of an earlier version of this service that the flyer no longer has
    await db
      .update(schema.serviceVariants)
      .set({ active: false })
      .where(and(eq(schema.serviceVariants.serviceId, s.id), notInArray(schema.serviceVariants.id, s.variants.map((v) => v.id))));
  }

  /* everything that is not on the flyer leaves the public site (kept in the database: old appointments point at it) */
  const flyerIds = FLYER_SERVICES.map((s) => s.id);
  const stale = await db.select({ id: schema.services.id }).from(schema.services).where(notInArray(schema.services.id, flyerIds));
  if (stale.length) {
    await db.update(schema.services).set({ visible: false, bookable: false }).where(inArray(schema.services.id, stale.map((s) => s.id)));
  }
  const deactivatedOffers: string[] = [];
  for (const offer of await db.select().from(schema.offers)) {
    if (offer.active && offer.components.some((c) => !flyerIds.includes(c.serviceId))) {
      await db.update(schema.offers).set({ active: false }).where(eq(schema.offers.id, offer.id));
      deactivatedOffers.push(offer.id);
    }
  }
  // Equipment only the removed demo "Head Spa" needed.
  await db.update(schema.resources).set({ active: false }).where(and(eq(schema.resources.kind, "equipment"), eq(schema.resources.type, "headspa-basin")));

  /* opening hours: Mo–Fr 9:30–18:30; Saturday "nach Vereinbarung" lives in hours_notes and gets no slots */
  await db.delete(schema.availabilityRules).where(isNull(schema.availabilityRules.resourceId));
  await db.insert(schema.availabilityRules).values(
    FLYER_STUDIO.openWeekdays.map((weekday) => ({ id: `hours-${weekday}`, resourceId: null, weekday, startTime: FLYER_STUDIO.open, endTime: FLYER_STUDIO.close })),
  );

  /* demo staff: shifts inside the new hours, qualified for every online-bookable treatment */
  const demoStaff = await db.select().from(schema.staff).where(eq(schema.staff.isDemo, true));
  const bookableIds = FLYER_SERVICES.filter((s) => !s.addon && s.variants.some((v) => v.minutes !== null)).map((s) => s.id);
  for (const member of demoStaff) {
    const shift = DEMO_SHIFTS[member.id];
    const resourceId = `staff:${member.id}`;
    if (shift) {
      await db.delete(schema.availabilityRules).where(eq(schema.availabilityRules.resourceId, resourceId));
      await db.insert(schema.availabilityRules).values(
        shift.days.map((weekday) => ({ id: `shift-${member.id}-${weekday}`, resourceId, weekday, startTime: shift.start, endTime: shift.end })),
      );
    }
    await db
      .insert(schema.staffSkills)
      .values(bookableIds.map((serviceId) => ({ staffId: member.id, serviceId })))
      .onConflictDoNothing();
  }

  return { services: FLYER_SERVICES.length, variants: variantCount, bookableVariants: bookableCount, hiddenServices: stale.map((s) => s.id), deactivatedOffers };
}

export type SeedResult = { credentials: { email: string; role: string; password: string }[] };

export async function seedDemo(db: Db, opts: { passwords?: Partial<Record<"owner" | "manager" | "therapist", string>> } = {}): Promise<SeedResult> {
  await db.insert(schema.businessSettings).values({
    id: 1,
    brand: FLYER_STUDIO.brand,
    timezone: "Europe/Berlin",
    currency: "EUR",
    socialLinks: {},
    bookingMode: "manual_confirmation",
    appointmentPayment: "pay_at_studio",
    paymentMode: "sandbox",
    whatsappEnabled: false,
    publicLaunchEnabled: false,
    voucherDenominationsCents: [5000, 10000, 15000],
    staffNotifyEmail: "studio-team@example.invalid",
    teamNote: "Bitte Behandlungsräume rechtzeitig vorbereiten und auf besondere Wünsche achten.",
    isDemo: true,
  });

  await db.insert(schema.assets).values(ASSETS);

  await db.insert(schema.staff).values([
    { id: "team-a", displayName: "Mitarbeitende A", isDemo: true },
    { id: "team-b", displayName: "Mitarbeitende B", isDemo: true },
  ]);
  await db.insert(schema.resources).values([
    { id: "staff:team-a", kind: "staff", type: null, name: { de: "Mitarbeitende A", en: "Staff A" } },
    { id: "staff:team-b", kind: "staff", type: null, name: { de: "Mitarbeitende B", en: "Staff B" } },
    { id: "room-1", kind: "room", type: "cosmetic", name: { de: "Raum 1", en: "Room 1" }, description: { de: "Kosmetik & Gesichtsbehandlungen", en: "Cosmetics & facials" } },
    { id: "room-2", kind: "room", type: "body", name: { de: "Raum 2", en: "Room 2" }, description: { de: "Massage & Körperanwendungen", en: "Massage & body treatments" } },
  ]);

  await applyFlyer(db);

  await db.insert(schema.contentPages).values([
    {
      id: "impressum",
      title: { de: "Impressum", en: "Legal notice" },
      body: { de: "Das Impressum wird vom Studio bereitgestellt und vor dem Livegang geprüft.", en: "The legal notice will be provided by the studio and reviewed before launch." },
      approved: false,
    },
    {
      id: "datenschutz",
      title: { de: "Datenschutz", en: "Privacy" },
      body: { de: "Die Datenschutzerklärung wird vom Studio bereitgestellt und vor dem Livegang geprüft.", en: "The privacy policy will be provided by the studio and reviewed before launch." },
      approved: false,
    },
  ]);

  const credentials: SeedResult["credentials"] = [];
  const random = () => Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString("base64url");
  const people: { role: "owner" | "manager" | "therapist"; email: string; name: string; staffId: string | null }[] = [
    { role: "owner", email: "inhaberin@hphuong.demo", name: "Demo Studio Verwaltung", staffId: null },
    { role: "manager", email: "leitung@hphuong.demo", name: "Demo Leitung", staffId: null },
    { role: "therapist", email: "team-a@hphuong.demo", name: "Mitarbeitende A", staffId: "team-a" },
  ];
  for (const p of people) {
    const password = opts.passwords?.[p.role] ?? random();
    await db.insert(schema.users).values({ id: `usr-${p.role}`, email: p.email, name: p.name, role: p.role, staffId: p.staffId, passwordHash: await hashPassword(password) });
    credentials.push({ email: p.email, role: p.role, password });
  }
  return { credentials };
}
