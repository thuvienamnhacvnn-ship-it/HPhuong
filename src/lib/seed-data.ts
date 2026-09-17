/**
 * Demo seed — from the KIT's demo-data.json (prices, durations, IDs, combo,
 * voucher denominations, booking/payment modes). Everything is flagged
 * is_demo and must be reviewed by the studio owner before launch.
 *
 * Texts are deliberately neutral: no skin-type promises, no medical claims,
 * no named staff, no ratings, no years of experience. Contact data stays
 * null exactly like the KIT — the site says "not configured yet" instead of
 * inventing an address or phone number.
 */
import type { Db } from "./db";
import { schema } from "./db";
import { hashPassword } from "./ids";

const svc = {
  gesichtspflege: {
    category: "gesicht",
    name: { de: "Gesichtspflege", en: "Facial Care" },
    teaser: { de: "Reinigung, Pflege und ein Moment der Ruhe für dein Gesicht.", en: "Cleansing, care and a quiet moment for your face." },
    description: {
      de: "Eine ruhige Gesichtsbehandlung mit Reinigung, sanftem Peeling, Maske und abschließender Pflege. Den genauen Ablauf stimmen wir vor Ort mit dir ab.",
      en: "A calm facial treatment with cleansing, gentle exfoliation, a mask and finishing care. We agree on the exact routine with you at the studio.",
    },
    steps: { de: ["Reinigung", "Sanftes Peeling", "Pflege & Maske", "Abschlusspflege"], en: ["Cleansing", "Gentle exfoliation", "Care & mask", "Finishing care"] },
    preparation: {
      de: ["Wenn möglich ungeschminkt kommen", "Bei Hautirritationen, Allergien oder laufender ärztlicher Behandlung bitte vorher Bescheid geben"],
      en: ["If possible, come without make-up", "Please tell us beforehand about skin irritation, allergies or ongoing medical treatment"],
    },
    image: "service-facial",
    bufferAfter: 15,
    roomTypes: ["cosmetic"],
    equipment: [] as string[],
    variants: [
      { id: "60", minutes: 60, priceCents: 6900 },
      { id: "90", minutes: 90, priceCents: 9900 },
    ],
  },
  "aroma-massage": {
    category: "massage",
    name: { de: "Aroma Massage", en: "Aroma Massage" },
    teaser: { de: "Entspannende Massage mit duftenden Ölen.", en: "A relaxing massage with scented oils." },
    description: {
      de: "Eine entspannende Ganzkörpermassage mit Aromaölen. Druck und Duft wählst du gemeinsam mit uns.",
      en: "A relaxing full-body massage with aroma oils. You choose pressure and scent together with us.",
    },
    steps: { de: ["Kurzes Vorgespräch", "Auswahl des Öls", "Massage", "Ruhezeit"], en: ["Short consultation", "Choice of oil", "Massage", "Rest"] },
    preparation: {
      de: ["Bitte ca. 10 Minuten vorher da sein", "Bei Beschwerden, Schwangerschaft oder Verletzungen bitte vorher Bescheid geben"],
      en: ["Please arrive about 10 minutes early", "Please tell us beforehand about complaints, pregnancy or injuries"],
    },
    image: "service-massage",
    bufferAfter: 15,
    roomTypes: ["body"],
    equipment: [] as string[],
    variants: [{ id: "60", minutes: 60, priceCents: 7500 }],
  },
  "head-spa": {
    category: "head-spa",
    name: { de: "Head Spa", en: "Head Spa" },
    teaser: { de: "Kopfhautpflege und Haarwäsche zum Abschalten.", en: "Scalp care and hair wash to unwind." },
    description: {
      de: "Eine Behandlung für Kopfhaut und Haar mit Reinigung, Massage und Pflege am Head-Spa-Becken.",
      en: "A treatment for scalp and hair with cleansing, massage and care at the head spa basin.",
    },
    steps: { de: ["Reinigung", "Kopfhautmassage", "Pflege", "Trocknen"], en: ["Cleansing", "Scalp massage", "Care", "Drying"] },
    preparation: { de: ["Keine besondere Vorbereitung nötig"], en: ["No special preparation needed"] },
    image: "service-headspa",
    bufferAfter: 15,
    roomTypes: ["cosmetic"],
    equipment: ["headspa-basin"],
    variants: [{ id: "45", minutes: 45, priceCents: 5900 }],
  },
  "wellness-fusspflege": {
    category: "pflege",
    name: { de: "Wellness Fußpflege", en: "Wellness Foot Care" },
    teaser: { de: "Sanfte Pflege für entspannte Füße.", en: "Gentle care for relaxed feet." },
    description: {
      de: "Eine kosmetische Wellness-Fußpflege mit Fußbad, Pflege und Massage. Keine medizinische Fußpflege.",
      en: "A cosmetic wellness foot care with foot bath, care and massage. Not a medical podiatry treatment.",
    },
    steps: { de: ["Fußbad", "Pflege", "Fußmassage"], en: ["Foot bath", "Care", "Foot massage"] },
    preparation: {
      de: ["Bei Diabetes, Wunden oder Pilzerkrankungen bitte vorher mit ärztlichem Fachpersonal sprechen und uns informieren"],
      en: ["With diabetes, wounds or fungal infections please consult a medical professional first and let us know"],
    },
    image: "service-footcare",
    bufferAfter: 10,
    roomTypes: ["body", "cosmetic"],
    equipment: [] as string[],
    variants: [{ id: "40", minutes: 40, priceCents: 4500 }],
  },
};

const ASSETS: (typeof schema.assets.$inferInsert)[] = [
  { id: "logo-medallion", source: "assets/brand/logo-medallion.png", width: 1254, height: 1254, alt: { de: "HPHUONG Logo", en: "HPHUONG logo" }, isConcept: false },
  { id: "logo-original", source: "assets/brand/logo-original.png", width: 1254, height: 1254, alt: { de: "HPHUONG Logo", en: "HPHUONG logo" }, isConcept: false },
  { id: "decor-lily", source: "assets/images/decor-lily.png", width: 1254, height: 1254, alt: { de: "", en: "" } },
  { id: "gift-card-blank", source: "assets/images/gift-card-blank.png", width: 1536, height: 1024, alt: { de: "Gutscheinkarte", en: "Gift card" } },
  { id: "hero-desktop", source: "assets/images/hero-desktop.png", width: 1659, height: 948, alt: { de: "Entspannende Gesichtsbehandlung", en: "Relaxing facial treatment" } },
  { id: "hero-mobile", source: "assets/images/hero-mobile.png", width: 1024, height: 1536, alt: { de: "Entspannende Gesichtsbehandlung", en: "Relaxing facial treatment" } },
  { id: "ritual-still-life", source: "assets/images/ritual-still-life.png", width: 1536, height: 1024, alt: { de: "Pflegeöl, Handtücher und Lilie", en: "Care oil, towels and lily" } },
  { id: "service-facial", source: "assets/images/service-facial.png", width: 1122, height: 1402, alt: { de: "Gesichtspflege mit Maske", en: "Facial with mask" } },
  { id: "service-footcare", source: "assets/images/service-footcare.png", width: 1122, height: 1402, alt: { de: "Wellness-Fußpflege", en: "Wellness foot care" } },
  { id: "service-headspa", source: "assets/images/service-headspa.png", width: 1122, height: 1402, alt: { de: "Head-Spa-Behandlung am Becken", en: "Head spa treatment at the basin" } },
  { id: "service-massage", source: "assets/images/service-massage.png", width: 1122, height: 1402, alt: { de: "Aroma-Massage", en: "Aroma massage" } },
  { id: "studio-interior", source: "assets/images/studio-interior.png", width: 1660, height: 948, alt: { de: "Raumvisualisierung eines Behandlungsraums", en: "Visualisation of a treatment room" } },
];

export type SeedResult = { credentials: { email: string; role: string; password: string }[] };

export async function seedDemo(db: Db, opts: { passwords?: Partial<Record<"owner" | "manager" | "therapist", string>> } = {}): Promise<SeedResult> {
  await db.insert(schema.businessSettings).values({
    id: 1,
    brand: "HPHUONG Cosmetic & Spa",
    timezone: "Europe/Berlin",
    currency: "EUR",
    address: null,
    phone: null,
    email: null,
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

  let order = 0;
  for (const [id, s] of Object.entries(svc)) {
    await db.insert(schema.services).values({
      id,
      category: s.category,
      name: s.name,
      teaser: s.teaser,
      description: s.description,
      steps: s.steps,
      preparation: s.preparation,
      contentApproved: false,
      imageAssetId: s.image,
      videoUrl: null,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: s.bufferAfter,
      roomTypes: s.roomTypes,
      equipmentTypes: s.equipment,
      sortOrder: order++,
      isDemo: true,
    });
    await db.insert(schema.serviceVariants).values(s.variants.map((v) => ({ serviceId: id, ...v })));
  }

  await db.insert(schema.staff).values([
    { id: "team-a", displayName: "Mitarbeitende A", isDemo: true },
    { id: "team-b", displayName: "Mitarbeitende B", isDemo: true },
  ]);
  await db.insert(schema.staffSkills).values([
    { staffId: "team-a", serviceId: "gesichtspflege" },
    { staffId: "team-a", serviceId: "head-spa" },
    { staffId: "team-a", serviceId: "wellness-fusspflege" },
    { staffId: "team-b", serviceId: "aroma-massage" },
    { staffId: "team-b", serviceId: "wellness-fusspflege" },
    { staffId: "team-b", serviceId: "gesichtspflege" },
  ]);
  await db.insert(schema.resources).values([
    { id: "staff:team-a", kind: "staff", type: null, name: { de: "Mitarbeitende A", en: "Staff A" } },
    { id: "staff:team-b", kind: "staff", type: null, name: { de: "Mitarbeitende B", en: "Staff B" } },
    { id: "room-1", kind: "room", type: "cosmetic", name: { de: "Raum 1", en: "Room 1" }, description: { de: "Kosmetik & Gesichtsbehandlungen", en: "Cosmetics & facials" } },
    { id: "room-2", kind: "room", type: "body", name: { de: "Raum 2", en: "Room 2" }, description: { de: "Massage & Körperanwendungen", en: "Massage & body treatments" } },
    { id: "eq-headspa-1", kind: "equipment", type: "headspa-basin", name: { de: "Head-Spa-Becken", en: "Head spa basin" } },
  ]);

  const rules: (typeof schema.availabilityRules.$inferInsert)[] = [];
  let n = 0;
  const rule = (resourceId: string | null, weekday: number, startTime: string, endTime: string) =>
    rules.push({ id: `rule-${++n}`, resourceId, weekday, startTime, endTime });
  for (const d of [1, 2, 3, 4, 5]) rule(null, d, "09:00", "18:00");
  rule(null, 6, "10:00", "15:00");
  for (const d of [1, 2, 3, 4, 5]) rule("staff:team-a", d, "09:00", "18:00");
  for (const d of [2, 3, 4, 5]) rule("staff:team-b", d, "10:00", "18:00");
  rule("staff:team-b", 6, "10:00", "15:00");
  await db.insert(schema.availabilityRules).values(rules);

  await db.insert(schema.offers).values({
    id: "pflege-ruhe",
    name: { de: "Pflege & Ruhe", en: "Care & Calm" },
    description: { de: "Gesichtspflege 60 Min. + Aroma Massage 60 Min.", en: "Facial Care 60 min + Aroma Massage 60 min" },
    priceCents: 12900,
    treatmentMinutes: 120,
    components: [
      { serviceId: "gesichtspflege", variantId: "60" },
      { serviceId: "aroma-massage", variantId: "60" },
    ],
    bookingMode: "staff_scheduling_request",
    channels: ["web"],
    combinable: false,
    imageAssetId: "service-massage",
    active: true,
    isDemo: true,
  });

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
