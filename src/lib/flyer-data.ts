/**
 * Studio data and price list from the studio's two flyers (source of truth:
 * `_w-agent/20_flyer-du-lieu.md`, transcribed from "H.P Flyer1.png" / "H.P Flyer2.png").
 *
 * Rules for this file:
 * - German names, subtitles, descriptions and steps are the flyer's wording, verbatim
 *   (formal "Sie" included). English is a close translation: nothing added, no promises.
 * - `minutes: null` = the flyer prints no duration. Such rows are shown with their price and
 *   can only be arranged by phone / WhatsApp. Never put a guessed number here.
 * - `from: true` = the flyer prints "ab" in front of the price.
 * - 67 price rows in 9 groups, 25 of them with a duration. tests/flyer.test.ts counts them.
 *
 * Room types, buffers and staff qualifications are NOT on the flyer — they are scheduling
 * defaults (see FLYER_SCHEDULING_DEFAULTS) the studio has to confirm.
 */
import type { Category, I18n } from "./categories";

export type FlyerVariant = {
  id: string;
  label?: I18n;
  minutes: number | null;
  priceCents: number;
  from?: boolean;
};

export type FlyerService = {
  id: string;
  category: Category;
  name: I18n;
  /** Flyer subtitle. */
  teaser?: I18n;
  description?: I18n;
  /** "Behandlungsablauf". */
  steps?: { de: string[]; en: string[] };
  /** media-config id; omitted = no fitting photo yet → text-only presentation. */
  image?: string;
  room: "cosmetic" | "body" | "any";
  /** "Extras": add-on rows, never booked on their own. */
  addon?: boolean;
  variants: FlyerVariant[];
};

export const FLYER_STUDIO = {
  brand: "HPHUONG Beauty - Cosmetic",
  address: "Kolonnenstraße 33, 10829 Berlin",
  phone: "030 78 71 29 51",
  mobilePhone: "0174 905 05 19",
  email: "beautymore.hoang@icloud.com",
  // A plain Google Maps search for the printed address — no coordinates, no place id.
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Kolonnenstra%C3%9Fe+33%2C+10829+Berlin",
  /** Montag–Freitag: 9:30–18:30 Uhr */
  openWeekdays: [1, 2, 3, 4, 5],
  open: "09:30",
  close: "18:30",
  /** Samstag: nach Vereinbarung — no online slots. Sunday is not mentioned on the flyer (= closed). */
  hoursNotes: { "6": { de: "nach Vereinbarung", en: "by appointment" } } as Record<string, I18n>,
};

/** Not from the flyer: what the scheduling engine needs to offer slots at all. To be confirmed by the studio. */
export const FLYER_SCHEDULING_DEFAULTS = { bufferBeforeMinutes: 0, bufferAfterMinutes: 15 };

const S = (de: string, en: string): I18n => ({ de, en });

/** Step names used in several treatments — one translation each. */
const STEP: Record<string, string> = {
  Hautdiagnose: "Skin analysis",
  Abreinigung: "Cleansing",
  Augenbrauenkorrektur: "Eyebrow shaping",
  "Augenbrauenkorrektur und -färbung": "Eyebrow shaping and tinting",
  Peeling: "Exfoliation",
  Bedampfung: "Steaming",
  Ausreinigung: "Extraction",
  "intensive Ausreinigung": "Intensive extraction",
  Gesichtsmassage: "Facial massage",
  Pflegepackung: "Care mask",
  Abschlusspflege: "Finishing care",
  Wirkstoffampulle: "Active-ingredient ampoule",
  Wirkstoffpackung: "Active-ingredient mask",
  "klärende Wirkstoffpackung": "Clarifying active-ingredient mask",
  Wirkstoffpflege: "Active-ingredient care",
  Feuchtigkeitspackung: "Moisturising mask",
  "Hals- und Dekolletépflege": "Neck and décolleté care",
  "Beauty-Wachs-Modellage": "Beauty wax modelling",
  "spezielle Augenpflege": "Special eye care",
  Massage: "Massage",
  Akupressur: "Acupressure",
  "Massage mit Pflegeampulle": "Massage with care ampoule",
  "Kurze Anamnese": "Brief consultation",
  Rückenmassage: "Back massage",
  "Aroma-Handbad": "Aroma hand bath",
  "intensive Handpflege": "Intensive hand care",
  Packung: "Mask",
  Fußpflege: "Foot care",
};

/** "A · B · C" exactly as printed → steps in both languages. */
function steps(printed: string) {
  const de = printed.split(" · ");
  return {
    de,
    en: de.map((s) => {
      const en = STEP[s];
      if (!en) throw new Error(`flyer-data: no translation for step "${s}"`);
      return en;
    }),
  };
}

const one = (minutes: number | null, priceCents: number, from = false): FlyerVariant[] => [
  { id: minutes === null ? "std" : String(minutes), minutes, priceCents, ...(from ? { from: true } : {}) },
];

const AUFFUELLEN = S("Auffüllen nach 3–4 Wochen", "Refill after 3–4 weeks");

export const FLYER_SERVICES: FlyerService[] = [
  /* ------------------------------------------------ B8 Gesicht & Pflege (6 rows) */
  {
    id: "basis-kosmetik",
    category: "gesicht-pflege",
    name: S("Basis-Kosmetik", "Basic Facial"),
    teaser: S("Professionelle Gesichtspflege", "Professional facial care"),
    description: S(
      "Eine klassische Gesichtsbehandlung zur gründlichen Reinigung und Pflege der Haut. Ideal, um das Hautbild zu verfeinern und der Haut neue Frische zu schenken.",
      "A classic facial treatment for thorough cleansing and care of the skin. Ideal for refining the complexion and giving the skin new freshness.",
    ),
    steps: steps("Hautdiagnose · Abreinigung · Augenbrauenkorrektur · Peeling · Bedampfung · Ausreinigung · Gesichtsmassage · Pflegepackung · Abschlusspflege"),
    image: "service-facial",
    room: "cosmetic",
    variants: one(60, 5000),
  },
  {
    id: "klassische-kosmetik",
    category: "gesicht-pflege",
    name: S("Klassische Kosmetik", "Classic Facial"),
    teaser: S("Intensivpflege für Gesicht und Dekolleté", "Intensive care for face and décolleté"),
    description: S(
      "Eine umfassende Kosmetikbehandlung mit hochwertigen Wirkstoffen, abgestimmt auf die individuellen Bedürfnisse Ihrer Haut.",
      "A comprehensive cosmetic treatment with high-quality active ingredients, tailored to the individual needs of your skin.",
    ),
    steps: steps(
      "Hautdiagnose · Abreinigung · Augenbrauenkorrektur und -färbung · Peeling · Bedampfung · Ausreinigung · Wirkstoffampulle · Wirkstoffpackung · Hals- und Dekolletépflege · Massage · Abschlusspflege",
    ),
    image: "service-serum",
    room: "cosmetic",
    variants: one(90, 7000),
  },
  {
    id: "anti-stress-behandlung",
    category: "gesicht-pflege",
    name: S("Anti-Stress-Behandlung", "Anti-Stress Treatment"),
    teaser: S("Entspannung und intensive Pflege", "Relaxation and intensive care"),
    description: S(
      "Diese wohltuende Behandlung kombiniert intensive Hautpflege mit einer sanften Entspannungsmassage. Hochwertige Wirkstoffe versorgen die Haut mit Feuchtigkeit und unterstützen ein frisches, gepflegtes Erscheinungsbild.",
      "This soothing treatment combines intensive skin care with a gentle relaxation massage. High-quality active ingredients supply the skin with moisture and support a fresh, well-groomed appearance.",
    ),
    steps: steps(
      "Hautdiagnose · Abreinigung · Augenbrauenkorrektur und -färbung · Peeling · Bedampfung · Ausreinigung · Wirkstoffpflege · Feuchtigkeitspackung · Hals- und Dekolletépflege · Massage · Abschlusspflege",
    ),
    image: "service-facial-massage",
    room: "cosmetic",
    variants: one(90, 7500),
  },
  {
    id: "anti-age-behandlung",
    category: "gesicht-pflege",
    name: S("Anti-Age-Behandlung", "Anti-Age Treatment"),
    teaser: S("Intensive Pflege für anspruchsvolle Haut", "Intensive care for demanding skin"),
    description: S(
      "Eine hochwertige Pflegebehandlung für reife und anspruchsvolle Haut. Die Beauty-Wachs-Modellage unterstützt die Aufnahme wertvoller Wirkstoffe. Sheabutter, Sojalecithin sowie die Vitamine A und E pflegen intensiv.",
      "A high-quality care treatment for mature and demanding skin. The beauty wax modelling supports the absorption of valuable active ingredients. Shea butter, soy lecithin and vitamins A and E provide intensive care.",
    ),
    steps: steps(
      "Hautdiagnose · Abreinigung · Augenbrauenkorrektur · Peeling · Bedampfung · Ausreinigung · Wirkstoffampulle · Beauty-Wachs-Modellage · Hals- und Dekolletépflege · Massage · Abschlusspflege",
    ),
    image: "service-antiage",
    room: "cosmetic",
    variants: one(105, 9500),
  },
  {
    id: "extras",
    category: "gesicht-pflege",
    name: S("Extras", "Extras"),
    room: "cosmetic",
    addon: true,
    variants: [
      { id: "wirkstoffampulle-serum", label: S("Wirkstoffampulle oder Serum", "Active-ingredient ampoule or serum"), minutes: null, priceCents: 700, from: true },
      { id: "fuss-handmassage", label: S("Fuß- oder Handmassage", "Foot or hand massage"), minutes: null, priceCents: 1000 },
    ],
  },

  /* ------------------------------------------------- B9 Spezial & Körper (8 rows) */
  {
    id: "augenbehandlung",
    category: "spezial-koerper",
    name: S("Augenbehandlung", "Eye Treatment"),
    teaser: S("Intensive Pflege für die empfindliche Augenpartie", "Intensive care for the delicate eye area"),
    description: S(
      "Eine gezielte Pflegebehandlung für müde und beanspruchte Augen. Sanfte Akupressur und ausgewählte Wirkstoffe unterstützen die Entspannung der Augenpartie und lassen sie frischer und strahlender erscheinen.",
      "A targeted care treatment for tired and strained eyes. Gentle acupressure and selected active ingredients support the relaxation of the eye area and let it appear fresher and more radiant.",
    ),
    steps: steps(
      "Hautdiagnose · Abreinigung · Augenbrauenkorrektur und -färbung · Peeling · Bedampfung · Ausreinigung · Wirkstoffampulle · Wirkstoffpackung · Hals- und Dekolletépflege · spezielle Augenpflege · Massage · Abschlusspflege",
    ),
    image: "service-eyecare",
    room: "cosmetic",
    variants: one(90, 8000),
  },
  {
    id: "aknebehandlung", image: "service-cleansing",
    category: "spezial-koerper",
    name: S("Aknebehandlung", "Acne Treatment"),
    teaser: S("Klärende Pflege für unreine und zu Akne neigende Haut", "Clarifying care for blemished and acne-prone skin"),
    description: S(
      "Eine gezielte Behandlung zur intensiven Reinigung und Pflege unreiner Haut. Regelmäßige Anwendungen können dazu beitragen, das Hautbild sichtbar zu verfeinern und Unreinheiten zu reduzieren.",
      "A targeted treatment for intensive cleansing and care of blemished skin. Regular applications can help to visibly refine the complexion and reduce impurities.",
    ),
    steps: steps("Hautdiagnose · Abreinigung · Peeling · Bedampfung · intensive Ausreinigung · klärende Wirkstoffpackung · Abschlusspflege"),
    room: "cosmetic",
    variants: [
      { id: "gesicht", label: S("Gesicht", "Face"), minutes: null, priceCents: 3500 },
      { id: "gesicht-dekollete", label: S("Gesicht & Dekolleté", "Face & décolleté"), minutes: null, priceCents: 4000, from: true },
      { id: "ruecken", label: S("Rücken", "Back"), minutes: null, priceCents: 2500, from: true },
    ],
  },
  {
    id: "bodyfit-monthalit", image: "service-bodywrap",
    category: "spezial-koerper",
    name: S("Bodyfit mit Monthalit", "Bodyfit with Monthalit"),
    teaser: S("Straffende Körperpflege mit Mineral-Sole-Schlick", "Firming body care with mineral brine mud"),
    description: S(
      "Eine intensive Körperbehandlung zur Pflege und Revitalisierung der Haut. Mineral-Sole-Schlick und gezielte Massagetechniken unterstützen ein glatteres, gepflegtes und strafferes Hautgefühl.",
      "An intensive body treatment for the care and revitalisation of the skin. Mineral brine mud and targeted massage techniques support a smoother, well-groomed and firmer skin feeling.",
    ),
    room: "body",
    variants: [
      { id: "entschlackungswickel", label: S("Entschlackungswickel", "Purifying wrap"), minutes: 50, priceCents: 4000 },
      { id: "mineral-sole-schlick", label: S("Mineral-Sole-Schlick-Behandlung", "Mineral brine mud treatment"), minutes: 60, priceCents: 4500 },
      { id: "cellulite", label: S("Cellulite-Behandlung für Beine und Gesäß", "Cellulite treatment for legs and buttocks"), minutes: 50, priceCents: 4000 },
    ],
  },
  {
    id: "rueckenbehandlung",
    category: "spezial-koerper",
    name: S("Rückenbehandlung", "Back Treatment"),
    teaser: S("Klassische Rückenmassage", "Classic back massage"),
    description: S(
      "Eine wohltuende Rückenmassage zur Lockerung verspannter Muskulatur und für mehr Entspannung im Alltag.",
      "A soothing back massage to loosen tense muscles and for more relaxation in everyday life.",
    ),
    steps: steps("Kurze Anamnese · Rückenmassage"),
    image: "service-massage",
    room: "body",
    variants: one(30, 3000),
  },

  /* ------------------------------------------- B7 Entspannung & Sugaring (11 rows) */
  {
    id: "bio-release-kopfmassage", image: "service-headmassage",
    category: "entspannung-sugaring",
    name: S("Bio-Release-Kopfmassage", "Bio-Release Head Massage"),
    teaser: S("Tiefenentspannung für Geist und Seele", "Deep relaxation for mind and soul"),
    description: S(
      "Diese wohltuende Spezialmassage für Gesicht, Kopfhaut und Nacken hilft dabei, Spannungen sanft zu lösen und ein tiefes Gefühl der Entspannung zu fördern. Eine harmonische Behandlung für mehr Wohlbefinden, Ruhe und neue Energie.",
      "This soothing special massage for face, scalp and neck helps to gently release tension and to promote a deep feeling of relaxation. A harmonious treatment for more well-being, calm and new energy.",
    ),
    steps: steps("Hautdiagnose · Abreinigung · Massage · Pflegepackung · Abschlusspflege"),
    room: "cosmetic",
    variants: one(60, 5000),
  },
  {
    id: "nervenbahnmassage", image: "service-facial-massage",
    category: "entspannung-sugaring",
    name: S("Nervenbahnmassage", "Nerve Pathway Massage"),
    teaser: S("Sanfte Aktivierung und Entspannung", "Gentle activation and relaxation"),
    description: S(
      "Gezielte Massagegriffe entlang ausgewählter Energiebahnen unterstützen die Durchblutung und fördern das allgemeine Wohlbefinden. Die Haut wirkt nach der Behandlung frischer, entspannter und vitaler.",
      "Targeted massage strokes along selected energy pathways support the circulation and promote general well-being. After the treatment the skin looks fresher, more relaxed and more vital.",
    ),
    steps: steps("Hautdiagnose · Abreinigung · Massage · Abschlusspflege"),
    room: "cosmetic",
    variants: one(45, 4500),
  },
  {
    id: "energetisches-lifting", image: "service-acupressure",
    category: "entspannung-sugaring",
    name: S("Energetisches Lifting", "Energetic Lifting"),
    teaser: S("Belebende Pflege für neue Ausstrahlung", "Invigorating care for a new radiance"),
    description: S(
      "Eine besondere Kombination aus sanfter Akupressur, Massage und hochwertiger Pflege. Gezielte Druckpunkte und ausgewählte Wirkstoffe unterstützen das Wohlbefinden und verleihen der Haut ein frisches, vitales Erscheinungsbild.",
      "A special combination of gentle acupressure, massage and high-quality care. Targeted pressure points and selected active ingredients support well-being and give the skin a fresh, vital appearance.",
    ),
    steps: steps("Hautdiagnose · Abreinigung · Akupressur · Massage mit Pflegeampulle · Abschlusspflege"),
    room: "cosmetic",
    variants: one(45, 4500),
  },
  {
    id: "sugaring", image: "service-sugaring",
    category: "entspannung-sugaring",
    name: S("Sugaring", "Sugaring"),
    teaser: S("Sanfte Haarentfernung mit Zuckerpaste", "Gentle hair removal with sugar paste"),
    description: S(
      "Sugaring entfernt unerwünschte Härchen besonders hautschonend und sorgt für ein angenehm glattes Hautgefühl.",
      "Sugaring removes unwanted hair in a way that is particularly gentle on the skin and leaves a pleasantly smooth skin feeling.",
    ),
    room: "cosmetic",
    variants: [
      { id: "oberlippe-kinn", label: S("Oberlippe & Kinn", "Upper lip & chin"), minutes: null, priceCents: 1000 },
      { id: "brust", label: S("Brust", "Chest"), minutes: null, priceCents: 2500, from: true },
      { id: "ruecken", label: S("Rücken", "Back"), minutes: null, priceCents: 3500, from: true },
      { id: "achseln", label: S("Achseln", "Underarms"), minutes: null, priceCents: 1000 },
      { id: "unterarme", label: S("Unterarme", "Forearms"), minutes: null, priceCents: 2000 },
      { id: "oberschenkel-knie", label: S("Oberschenkel & Knie", "Thighs & knees"), minutes: null, priceCents: 2800 },
      { id: "unterschenkel-knie", label: S("Unterschenkel & Knie", "Lower legs & knees"), minutes: null, priceCents: 2200 },
      { id: "beine-komplett", label: S("Beine komplett", "Full legs"), minutes: null, priceCents: 4800 },
    ],
  },

  /* ---------------------------------------------- B3 Massage & Wellness (9 rows) */
  {
    id: "lomi-lomi-nui-massage",
    category: "massage-wellness",
    name: S("Lomi-Lomi-Nui-Massage", "Lomi Lomi Nui Massage"),
    description: S(
      "Traditionelle hawaiianische Ganzkörpermassage mit fließenden, harmonischen Massagebewegungen für tiefe Entspannung.",
      "Traditional Hawaiian full-body massage with flowing, harmonious massage movements for deep relaxation.",
    ),
    image: "service-massage",
    room: "body",
    variants: one(80, 8000),
  },
  {
    id: "ayurvedische-ganzkoerpermassage",
    category: "massage-wellness",
    name: S("Ayurvedische Ganzkörpermassage", "Ayurvedic Full-Body Massage"),
    description: S(
      "Wohltuende Ganzkörpermassage mit warmem Öl zur Entspannung, Regeneration und Pflege der Haut.",
      "Soothing full-body massage with warm oil for relaxation, regeneration and care of the skin.",
    ),
    image: "service-ayurveda",
    room: "body",
    variants: one(60, 5000),
  },
  {
    id: "hot-stone-massage",
    category: "massage-wellness",
    name: S("Hot-Stone-Massage", "Hot Stone Massage"),
    description: S("Entspannende Massage mit angenehm erwärmten Steinen.", "Relaxing massage with pleasantly warmed stones."),
    image: "service-hotstone",
    room: "body",
    variants: one(60, 5500),
  },
  {
    id: "gesichtsmassage", image: "service-facial-massage",
    category: "massage-wellness",
    name: S("Gesichtsmassage", "Facial Massage"),
    description: S("Sanfte Massage für Gesicht und Dekolleté.", "Gentle massage for face and décolleté."),
    room: "cosmetic",
    variants: one(30, 2000),
  },
  {
    id: "schulter-nackenmassage",
    category: "massage-wellness",
    name: S("Schulter-Nackenmassage", "Shoulder and Neck Massage"),
    description: S(
      "Gezielte Massage zur Lockerung und Entspannung des Schulter- und Nackenbereichs.",
      "Targeted massage to loosen and relax the shoulder and neck area.",
    ),
    image: "service-shoulder",
    room: "body",
    variants: one(20, 2500),
  },
  {
    id: "rueckenmassage",
    category: "massage-wellness",
    name: S("Rückenmassage", "Back Massage"),
    description: S("Entspannende Massage für Rücken und Muskulatur.", "Relaxing massage for back and muscles."),
    image: "service-massage",
    room: "body",
    variants: one(30, 2500),
  },
  {
    id: "fussreflexzonenmassage",
    category: "massage-wellness",
    name: S("Fußreflexzonenmassage mit Fußbad", "Foot Reflexology Massage with Foot Bath"),
    description: S("Wohltuende Behandlung für müde und beanspruchte Füße.", "Soothing treatment for tired and strained feet."),
    image: "service-footreflex",
    room: "body",
    variants: one(25, 2000),
  },
  {
    id: "kopfmassage", image: "service-headmassage",
    category: "massage-wellness",
    name: S("Kopfmassage", "Head Massage"),
    description: S("Sanfte Entspannungsmassage für Kopf und Kopfhaut.", "Gentle relaxation massage for head and scalp."),
    room: "cosmetic",
    variants: one(30, 2000),
  },
  {
    id: "ganzkoerpermassage",
    category: "massage-wellness",
    name: S("Ganzkörpermassage", "Full-Body Massage"),
    description: S("Klassische Wellnessmassage für ganzheitliche Entspannung.", "Classic wellness massage for holistic relaxation."),
    image: "service-massage",
    room: "body",
    variants: one(60, 5000),
  },

  /* -------------------------------------------------------- B5 Maniküre (5 rows) */
  { id: "klassische-manikuere", category: "manikuere", name: S("Klassische Maniküre", "Classic Manicure"), room: "cosmetic", variants: one(null, 1800) },
  { id: "manikuere-farblack", category: "manikuere", name: S("Maniküre mit Farblack", "Manicure with Coloured Polish"), room: "cosmetic", variants: one(null, 2200) },
  { id: "handpflege-paraffinbad", category: "manikuere", name: S("Handpflege mit Paraffinbad", "Hand Care with Paraffin Bath"), room: "cosmetic", variants: one(null, 2800) },
  {
    id: "hand-armpackung",
    category: "manikuere",
    name: S("Hand- und Armpackung mit Bürstenmassage", "Hand and Arm Mask with Brush Massage"),
    room: "cosmetic",
    variants: one(null, 1500),
  },
  {
    id: "spa-manikuere", image: "service-manicure",
    category: "manikuere",
    name: S("SPA-Maniküre", "SPA Manicure"),
    description: S("Ein wohltuendes Pflegeprogramm für schöne und gepflegte Hände.", "A soothing care programme for beautiful and well-groomed hands."),
    steps: steps("Aroma-Handbad · Peeling · intensive Handpflege · Packung · Massage"),
    room: "cosmetic",
    variants: one(45, 2800),
  },

  /* -------------------------------------------------------- B6 Pediküre (5 rows) */
  {
    id: "klassische-fusspflege",
    category: "pedikuere",
    name: S("Klassische Fußpflege mit GEHWOL-Produkten", "Classic Foot Care with GEHWOL Products"),
    image: "service-footcare",
    room: "any",
    variants: one(45, 3000, true),
  },
  { id: "fusspflege-farblack", category: "pedikuere", name: S("Fußpflege mit Farblack", "Foot Care with Coloured Polish"), image: "service-footcare", room: "any", variants: one(null, 3500) },
  {
    id: "fusspflege-fussreflex",
    category: "pedikuere",
    name: S("Fußpflege mit Fußreflexzonenmassage", "Foot Care with Foot Reflexology Massage"),
    image: "service-footcare",
    room: "any",
    variants: one(null, 4000),
  },
  { id: "fussmassage-pflegepackung", category: "pedikuere", name: S("Fußmassage mit Pflegepackung", "Foot Massage with Care Mask"), image: "service-footcare", room: "any", variants: one(30, 2000) },
  {
    id: "spa-pedikuere",
    category: "pedikuere",
    name: S("SPA-Pediküre", "SPA Pedicure"),
    description: S("Ein besonderes Wohlfühlprogramm für gepflegte und entspannte Füße.", "A special feel-good programme for well-groomed and relaxed feet."),
    steps: steps("Fußpflege · Peeling · Pflegepackung · Massage"),
    image: "service-footcare",
    room: "any",
    variants: one(60, 4500),
  },

  /* ----------------------------------------------------- B2 Nageldesign (11 rows) */
  { id: "shellac", category: "nageldesign", name: S("Shellac", "Shellac"), room: "cosmetic", variants: one(null, 1500) },
  {
    id: "neumodellage",
    category: "nageldesign",
    name: S("Neumodellage", "New Set"),
    room: "cosmetic",
    variants: [
      { id: "natur", label: S("Natur", "Natural"), minutes: null, priceCents: 2500, from: true },
      { id: "natur-make-up", label: S("Natur Make-up", "Natural make-up"), minutes: null, priceCents: 3000, from: true },
      { id: "glitzer", label: S("Glitzer", "Glitter"), minutes: null, priceCents: 3200, from: true },
      { id: "french-ombre", label: S("French / Ombré", "French / Ombré"), minutes: null, priceCents: 3500, from: true },
      { id: "french-ombre-farbe", label: S("French / Ombré in Farbe", "French / Ombré in colour"), minutes: null, priceCents: 3700, from: true },
    ],
  },
  {
    id: "nagel-auffuellen",
    category: "nageldesign",
    name: S("Auffüllen", "Refill"),
    room: "cosmetic",
    variants: [
      { id: "natur", label: S("Natur", "Natural"), minutes: null, priceCents: 2300, from: true },
      { id: "natur-make-up", label: S("Natur Make-up", "Natural make-up"), minutes: null, priceCents: 2800, from: true },
      { id: "glitzer", label: S("Glitzer", "Glitter"), minutes: null, priceCents: 3000, from: true },
      { id: "french-ombre", label: S("French / Ombré", "French / Ombré"), minutes: null, priceCents: 3300, from: true },
      { id: "french-ombre-farbe", label: S("French / Ombré in Farbe", "French / Ombré in colour"), minutes: null, priceCents: 3500, from: true },
    ],
  },

  /* --------------------------------------------- B1 Wimpernverlängerung (7 rows) */
  // The flyer prints the four rows directly under the group title, then the sub-headings
  // "Augenbrauenkorrektur" (one row) and "Wimpernlifting" (two rows). Kept exactly like that.
  {
    id: "wimpernverlaengerung",
    category: "wimpernverlaengerung",
    name: S("Wimpernverlängerung", "Eyelash Extensions"),
    room: "cosmetic",
    variants: [
      { id: "neuanlage-classic", label: S("Neuanlage Classic", "New set Classic"), minutes: null, priceCents: 4900 },
      { id: "auffuellen-classic", label: AUFFUELLEN, minutes: null, priceCents: 3000 },
      { id: "neuanlage-volume", label: S("Neuanlage Volume", "New set Volume"), minutes: null, priceCents: 9000 },
      { id: "auffuellen-volume", label: AUFFUELLEN, minutes: null, priceCents: 6900 },
    ],
  },
  {
    id: "wimpern-augenbrauenkorrektur",
    category: "wimpernverlaengerung",
    name: S("Augenbrauenkorrektur", "Eyebrow Shaping"),
    room: "cosmetic",
    variants: [{ id: "augenbrauen-wimpernfaerben", label: S("Augenbrauen- und Wimpernfärben", "Eyebrow and eyelash tinting"), minutes: null, priceCents: 2200, from: true }],
  },
  {
    id: "wimpernlifting",
    category: "wimpernverlaengerung",
    name: S("Wimpernlifting", "Lash Lift"),
    room: "cosmetic",
    variants: [
      {
        id: "entfernen-bei-neuanlage",
        label: S("Entfernen alter Wimpernextensions bei Neuanlage", "Removal of old eyelash extensions with a new set"),
        minutes: null,
        priceCents: 1000,
      },
      { id: "entfernen", label: S("Entfernen von Wimpernextensions", "Removal of eyelash extensions"), minutes: null, priceCents: 1500 },
    ],
  },

  /* --------------------------------------------------- B4 Augenkosmetik (5 rows) */
  { id: "augenbrauenkorrektur", category: "augenkosmetik", name: S("Augenbrauenkorrektur", "Eyebrow Shaping"), room: "cosmetic", variants: one(null, 700) },
  { id: "augenbrauen-faerben", category: "augenkosmetik", name: S("Augenbrauen färben", "Eyebrow Tinting"), room: "cosmetic", variants: one(null, 1000) },
  { id: "wimpern-faerben", category: "augenkosmetik", name: S("Wimpern färben", "Eyelash Tinting"), room: "cosmetic", variants: one(null, 1200) },
  {
    id: "augenbrauen-wimpern-faerben",
    category: "augenkosmetik",
    name: S("Augenbrauen und Wimpern färben", "Eyebrow and Eyelash Tinting"),
    room: "cosmetic",
    variants: one(null, 1700),
  },
  { id: "tages-make-up", category: "augenkosmetik", name: S("Tages-Make-up", "Day Make-up"), room: "cosmetic", variants: one(null, 2000) },
];

/** Shown on the home page's treatment card. */
export const FEATURED_SERVICE_ID = "basis-kosmetik";

export const ROOM_TYPES: Record<FlyerService["room"], string[]> = { cosmetic: ["cosmetic"], body: ["body"], any: ["body", "cosmetic"] };
