import { and, asc, eq, inArray } from "drizzle-orm";
import type { DbOrTx } from "./db";
import { schema } from "./db";
import { DomainError } from "./errors";

export type Settings = typeof schema.businessSettings.$inferSelect;
export type Service = typeof schema.services.$inferSelect;
export type Variant = typeof schema.serviceVariants.$inferSelect;
export type Asset = typeof schema.assets.$inferSelect;
export type Offer = typeof schema.offers.$inferSelect;
export type ServiceWithVariants = Service & { variants: Variant[]; image: Asset | null };

export const CATEGORIES = ["gesicht", "massage", "head-spa", "pflege"] as const;
export type Category = (typeof CATEGORIES)[number];

export async function getSettings(db: DbOrTx): Promise<Settings> {
  const [row] = await db.select().from(schema.businessSettings).where(eq(schema.businessSettings.id, 1));
  if (!row) throw new DomainError("settings_missing", 500, "Run `npm run seed` first.");
  return row;
}

export type ServiceFilter = {
  category?: string | null;
  q?: string | null;
  maxPriceCents?: number | null;
  maxMinutes?: number | null;
  bookableOnly?: boolean;
  includeHidden?: boolean;
};

export async function listServices(db: DbOrTx, filter: ServiceFilter = {}): Promise<ServiceWithVariants[]> {
  const rows = await db.select().from(schema.services).orderBy(asc(schema.services.sortOrder));
  const ids = rows.map((r) => r.id);
  const variants = ids.length
    ? await db.select().from(schema.serviceVariants).where(inArray(schema.serviceVariants.serviceId, ids)).orderBy(asc(schema.serviceVariants.minutes))
    : [];
  const assets = await db.select().from(schema.assets);
  const q = filter.q?.trim().toLowerCase();

  return rows
    .map((s) => ({
      ...s,
      variants: variants.filter((v) => v.serviceId === s.id && (filter.includeHidden || v.active)),
      image: assets.find((a) => a.id === s.imageAssetId) ?? null,
    }))
    .filter((s) => filter.includeHidden || (s.visible && s.variants.length > 0))
    .filter((s) => !filter.category || filter.category === "alle" || s.category === filter.category)
    .filter((s) => !q || s.name.de.toLowerCase().includes(q) || s.name.en.toLowerCase().includes(q) || s.category.includes(q))
    .filter((s) => !filter.bookableOnly || s.bookable)
    .filter((s) => !filter.maxPriceCents || s.variants.some((v) => v.priceCents <= filter.maxPriceCents!))
    .filter((s) => !filter.maxMinutes || s.variants.some((v) => v.minutes <= filter.maxMinutes!));
}

export async function getService(db: DbOrTx, id: string, opts: { includeHidden?: boolean } = {}): Promise<ServiceWithVariants | null> {
  const [s] = await db.select().from(schema.services).where(eq(schema.services.id, id));
  if (!s || (!opts.includeHidden && !s.visible)) return null;
  const variants = await db
    .select()
    .from(schema.serviceVariants)
    .where(opts.includeHidden ? eq(schema.serviceVariants.serviceId, id) : and(eq(schema.serviceVariants.serviceId, id), eq(schema.serviceVariants.active, true)))
    .orderBy(asc(schema.serviceVariants.minutes));
  const [image] = s.imageAssetId ? await db.select().from(schema.assets).where(eq(schema.assets.id, s.imageAssetId)) : [];
  return { ...s, variants, image: image ?? null };
}

/** Server-authoritative variant lookup. Never trust prices sent by a client or a model. */
export async function resolveVariant(db: DbOrTx, serviceId: string, variantId: string) {
  const service = await getService(db, serviceId);
  if (!service) throw new DomainError("service_not_found", 404);
  const variant = service.variants.find((v) => v.id === variantId);
  if (!variant) throw new DomainError("variant_not_found", 404);
  return { service, variant };
}

export function offerIsCurrent(offer: Offer, now = new Date()) {
  if (!offer.active) return false;
  if (offer.validFrom && offer.validFrom > now) return false;
  if (offer.validUntil && offer.validUntil <= now) return false;
  return true;
}

export async function listOffers(db: DbOrTx, now = new Date()) {
  const rows = await db.select().from(schema.offers);
  return rows.filter((o) => offerIsCurrent(o, now));
}

export async function getOffer(db: DbOrTx, id: string, now = new Date()) {
  const [offer] = await db.select().from(schema.offers).where(eq(schema.offers.id, id));
  if (!offer) return null;
  const components = await Promise.all(offer.components.map((c) => resolveVariant(db, c.serviceId, c.variantId)));
  const assets = offer.imageAssetId ? await db.select().from(schema.assets).where(eq(schema.assets.id, offer.imageAssetId)) : [];
  return { offer, components, current: offerIsCurrent(offer, now), image: assets[0] ?? null };
}

export type Quote = {
  kind: "service" | "offer";
  items: { serviceId: string; variantId: string; name: { de: string; en: string }; minutes: number; priceCents: number }[];
  totalCents: number;
  treatmentMinutes: number;
  currency: string;
  offerId?: string;
  bookingMode: string;
};

export async function quote(db: DbOrTx, input: { serviceId?: string; variantId?: string; offerId?: string }, now = new Date()): Promise<Quote> {
  const settings = await getSettings(db);
  if (input.offerId) {
    const found = await getOffer(db, input.offerId, now);
    if (!found) throw new DomainError("offer_not_found", 404);
    if (!found.current) throw new DomainError("offer_expired", 409);
    return {
      kind: "offer",
      offerId: found.offer.id,
      items: found.components.map(({ service, variant }) => ({
        serviceId: service.id,
        variantId: variant.id,
        name: service.name,
        minutes: variant.minutes,
        priceCents: variant.priceCents,
      })),
      totalCents: found.offer.priceCents,
      treatmentMinutes: found.offer.treatmentMinutes,
      currency: settings.currency,
      bookingMode: found.offer.bookingMode,
    };
  }
  if (!input.serviceId || !input.variantId) throw new DomainError("invalid_quote_request");
  const { service, variant } = await resolveVariant(db, input.serviceId, input.variantId);
  return {
    kind: "service",
    items: [{ serviceId: service.id, variantId: variant.id, name: service.name, minutes: variant.minutes, priceCents: variant.priceCents }],
    totalCents: variant.priceCents,
    treatmentMinutes: variant.minutes,
    currency: settings.currency,
    bookingMode: service.bookable ? settings.bookingMode : "not_bookable",
  };
}
