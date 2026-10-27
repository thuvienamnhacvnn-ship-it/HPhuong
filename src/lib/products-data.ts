/**
 * Products sold in the studio (brand: GERTRAUD GRUBER Kosmetik Kultur). Names are the brand's own
 * and stay untranslated; only the short description is localised. Images are packshots made from the
 * owner's sample photos (assets/images/produkt-*.png, ids in media-config.ts).
 */
export type ProductGroup = "gesicht" | "koerper" | "herren" | "sets";

export type Product = {
  id: string;
  image: `produkt-${string}`;
  name: string;
  /** Further product names that are on the picture. */
  also?: string[];
  group: ProductGroup;
  text: { de: string; en: string };
};

export const PRODUCTS: Product[] = [
  {
    id: "authentique",
    image: "produkt-authentique",
    name: "Authentique",
    also: ["Cell Protect Serum", "Cell Protect Cream", "Eye & Lip Contour Lift"],
    group: "gesicht",
    text: { de: "Zellschutz aus der Kraft der Natur – Serum, Creme und Pflege für Augen und Lippen.", en: "Cell protection from the power of nature – serum, cream and care for eyes and lips." },
  },
  {
    id: "cell-protect-cream",
    image: "produkt-cell-protect-cream",
    name: "Authentique Cell Protect Cream",
    group: "gesicht",
    text: { de: "Gesichtscreme aus der Serie Authentique.", en: "Face cream from the Authentique series." },
  },
  {
    id: "hydro-hyaluron-serum",
    image: "produkt-hydro-hyaluron-serum",
    name: "Hydro³ Hyaluron Serum",
    group: "gesicht",
    text: { de: "Feuchtigkeitsserum mit Hyaluron für das Gesicht.", en: "Moisturising serum with hyaluronic acid for the face." },
  },
  {
    id: "ceramid-ampulle",
    image: "produkt-ceramid-ampulle",
    name: "Ceramid Ampulle",
    group: "gesicht",
    text: { de: "Ampullenpflege für das Gesicht.", en: "Ampoule care for the face." },
  },
  {
    id: "isoflavon",
    image: "produkt-isoflavon",
    name: "Isoflavon Reinigungsmilch",
    also: ["Isoflavon Vitamin Tonic 50 ml", "Clear & Pure Cleansing Set"],
    group: "gesicht",
    text: { de: "Sanfte Reinigung für das Gesicht – mit Vitamin Tonic als Geschenk im Set.", en: "Gentle facial cleansing – with a vitamin tonic as a gift in the set." },
  },
  {
    id: "aloe-vera-packung",
    image: "produkt-aloe-vera-packung",
    name: "Aloe Vera Packung",
    also: ["Beruhigungspackung"],
    group: "gesicht",
    text: { de: "Zwei Packungen für sonnige Tage – mit Aloe Vera und Panthenol.", en: "Two masks for sunny days – with aloe vera and panthenol." },
  },
  {
    id: "lippenpflege",
    image: "produkt-lippenpflege",
    name: "Lippenpflege",
    group: "koerper",
    text: { de: "Pflegestift für die Lippen.", en: "Care stick for the lips." },
  },
  {
    id: "men-xo",
    image: "produkt-men-xo",
    name: "men XO",
    also: ["Vital Pflegedusche Hair & Body", "After Shave Balm Ultra Comfort"],
    group: "herren",
    text: { de: "Pflege für den Mann – Dusche für Haar und Körper und After Shave Balm.", en: "Care for men – hair and body wash and after shave balm." },
  },
  {
    id: "kennenlern-sets",
    image: "produkt-kennenlern-sets",
    name: "Kennenlern-Sets",
    also: ["Ready to Go Gesichtspflegeset", "Best Bodies Körperpflegeset", "Dream Team Gesichtspflegeset"],
    group: "sets",
    text: { de: "Pflege, die sich anfühlt wie eine kleine Auszeit am Tegernsee.", en: "Care that feels like a short break at Lake Tegernsee." },
  },
  {
    id: "exquisit-set",
    image: "produkt-exquisit-set",
    name: "Exquisit Hautpflege-Set",
    also: ["Körperpflege-Set für Sie", "Hand- und Nagelpflege-Set"],
    group: "sets",
    text: { de: "Pflege-Sets zum Verschenken oder zum Kennenlernen.", en: "Care sets to give as a gift or to get to know the range." },
  },
];
