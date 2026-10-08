/**
 * The studio's nine treatment groups, in display order. Names, subtitles, intro
 * texts and notes are the German wording of the studio's price flyer (verbatim);
 * English is a close translation. No database access here — safe to import
 * from client components.
 */
export type I18n = { de: string; en: string };

export const CATEGORIES = [
  "gesicht-pflege",
  "spezial-koerper",
  "entspannung-sugaring",
  "massage-wellness",
  "manikuere",
  "pedikuere",
  "nageldesign",
  "wimpernverlaengerung",
  "augenkosmetik",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const isCategory = (v: string | null | undefined): v is Category => !!v && (CATEGORIES as readonly string[]).includes(v);

/** "manikuere,pedikuere" → ["manikuere", "pedikuere"]; unknown ids are dropped. */
export function parseCategories(raw: string | null | undefined): Category[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()))].filter(isCategory);
}

export type CategoryInfo = {
  name: I18n;
  /** Line under the group title. */
  subtitle?: I18n;
  /** Paragraphs describing what every treatment of the group includes. */
  intro?: { de: string[]; en: string[] };
  /** Notes of the group (shown after the list). */
  notes?: { de: string[]; en: string[] };
  /** Picture of the group: beside its price list when none of its rows has one of its own, and as fallback where one per group is needed (account, appointment page). null = no fitting photo yet. */
  image: string | null;
};

export const CATEGORY_INFO: Record<Category, CategoryInfo> = {
  "gesicht-pflege": {
    name: { de: "Gesicht & Pflege", en: "Face & Care" },
    subtitle: { de: "Klassische und intensive Kosmetikbehandlungen", en: "Classic and intensive cosmetic treatments" },
    image: "service-facial",
  },
  "spezial-koerper": {
    name: { de: "Spezial & Körper", en: "Special & Body" },
    subtitle: { de: "Gezielte Pflege für Augen, Haut, Körper und Rücken", en: "Targeted care for eyes, skin, body and back" },
    image: "service-bodywrap",
  },
  "entspannung-sugaring": {
    name: { de: "Entspannung & Sugaring", en: "Relaxation & Sugaring" },
    subtitle: { de: "Wohltuende Rituale für Gesicht, Kopf und Körper", en: "Soothing rituals for face, head and body" },
    image: "service-headmassage",
  },
  "massage-wellness": {
    name: { de: "Massage & Wellness", en: "Massage & Wellness" },
    notes: { de: ["Alle Massagen sind reine Wellnessbehandlungen."], en: ["All massages are purely wellness treatments."] },
    image: "service-massage",
  },
  manikuere: {
    name: { de: "Maniküre", en: "Manicure" },
    subtitle: { de: "Professionelle Hand- und Nagelpflege", en: "Professional hand and nail care" },
    intro: {
      de: [
        "Gönnen Sie Ihren Händen und Fingernägeln eine professionelle Pflege. Die Behandlung umfasst Handbad, Feilen und Polieren der Nägel, Nagelhautpflege und Abschlusspflege.",
      ],
      en: [
        "Treat your hands and fingernails to professional care. The treatment includes a hand bath, filing and polishing of the nails, cuticle care and finishing care.",
      ],
    },
    image: "service-manicure",
  },
  pedikuere: {
    name: { de: "Pediküre", en: "Pedicure" },
    subtitle: { de: "Professionelle Fußpflege", en: "Professional foot care" },
    intro: {
      de: [
        "Gönnen Sie Ihren Füßen eine intensive und professionelle Pflege mit hochwertigen GEHWOL-Produkten.",
        "Die Behandlung umfasst eine kurze Anamnese, Fußbad, Hornhautentfernung, Nagel- und Nagelhautpflege sowie eine pflegende Abschlussbehandlung.",
      ],
      en: [
        "Treat your feet to intensive, professional care with high-quality GEHWOL products.",
        "The treatment includes a brief consultation, a foot bath, callus removal, nail and cuticle care and a nourishing finishing treatment.",
      ],
    },
    notes: {
      de: ["Bitte bringen Sie zu Ihrer Behandlung ein kleines Handtuch mit."],
      en: ["Please bring a small towel to your treatment."],
    },
    image: "service-footcare",
  },
  nageldesign: { name: { de: "Nageldesign", en: "Nail Design" }, image: "service-nails" },
  wimpernverlaengerung: { name: { de: "Wimpernverlängerung", en: "Eyelash Extensions" }, image: "service-lashes" },
  augenkosmetik: { name: { de: "Augenkosmetik", en: "Eye Cosmetics" }, image: "service-brows" },
};

export const categoryName = (id: string, locale: "de" | "en") => (isCategory(id) ? CATEGORY_INFO[id].name[locale] : id);
