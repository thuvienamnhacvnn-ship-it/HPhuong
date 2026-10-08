import { and, asc, eq, inArray } from "drizzle-orm";
import type { DbOrTx } from "./db";
import { schema } from "./db";
import { DomainError } from "./errors";
import { CATEGORIES, CATEGORY_INFO, parseCategories, type Category } from "./categories";

export type Settings = typeof schema.businessSettings.$inferSelect;
export type Service = typeof schema.services.$inferSelect;
export type Variant = typeof schema.serviceVariants.$inferSelect;
export type Asset = typeof schema.assets.$inferSelect;
export type Offer = typeof schema.offers.$inferSelect;
export type ServiceWithVariants = Service & { variants: Variant[]; image: Asset | null };
/** A price row with a published duration — the only kind that can be booked online. */
export type TimedVariant = Variant & { minutes: number };

export { CATEGORIES, type Category };

export const isTimed = (v: Variant): v is TimedVariant => v.minutes !== null;

/** The rows of a service a guest can book online: the service is bookable AND the row has a duration. */
export const bookableVariants = (s: Pick<ServiceWithVariants, "bookable" | "isAddon" | "variants">): TimedVariant[] =>
  s.bookable && !s.isAddon ? s.variants.filter(isTimed) : [];

export const isBookableOnline = (s: Pick<ServiceWithVariants, "bookable" | "isAddon" | "variants">) => bookableVariants(s).length > 0;

/** "Bodyfit mit Monthalit – Entschlackungswickel" for labelled rows, the service name otherwise. */
export function variantName(service: Pick<Service, "name">, variant: Pick<Variant, "label">): { de: string; en: string } {
  if (!variant.label) return service.name;
  return { de: `${service.name.de} – ${variant.label.de}`, en: `${service.name.en} – ${variant.label.en}` };
}

export async function getSettings(db: DbOrTx): Promise<Settings> {
  const [row] = await db.select().from(schema.businessSettings).where(eq(schema.businessSettings.id, 1));
  if (!row) throw new DomainError("settings_missing", 500, "Run `npm run seed` first.");
  return row;
}

export type ServiceFilter = {
  /** One category id or several separated by commas ("manikuere,pedikuere"); "alle"/empty = all. */
  category?: string | null;
  q?: string | null;
  maxPriceCents?: number | null;
  maxMinutes?: number | null;
  /** Only services with at least one online-bookable row. Their untimed rows stay in `variants`. */
  bookableOnly?: boolean;
  includeHidden?: boolean;
};

const byOrder = (a: Variant, b: Variant) => a.sortOrder - b.sortOrder || (a.minutes ?? 0) - (b.minutes ?? 0) || a.priceCents - b.priceCents;

export async function listServices(db: DbOrTx, filter: ServiceFilter = {}): Promise<ServiceWithVariants[]> {
  const rows = await db.select().from(schema.services).orderBy(asc(schema.services.sortOrder));
  const ids = rows.map((r) => r.id);
  const variants = ids.length ? await db.select().from(schema.serviceVariants).where(inArray(schema.serviceVariants.serviceId, ids)) : [];
  const assets = await db.select().from(schema.assets);
  const q = filter.q?.trim().toLowerCase();
  const cats = parseCategories(filter.category);
  const hit = (text: string | undefined) => !!text && text.toLowerCase().includes(q!);

  return rows
    .map((s) => ({
      ...s,
      variants: variants.filter((v) => v.serviceId === s.id && (filter.includeHidden || v.active)).sort(byOrder),
      image: assets.find((a) => a.id === s.imageAssetId) ?? null,
    }))
    .filter((s) => filter.includeHidden || (s.visible && s.variants.length > 0))
    .filter((s) => cats.length === 0 || (cats as string[]).includes(s.category))
    .filter(
      (s) =>
        !q ||
        hit(s.name.de) ||
        hit(s.name.en) ||
        hit(s.category) ||
        hit(CATEGORY_INFO[s.category as Category]?.name.de) ||
        hit(CATEGORY_INFO[s.category as Category]?.name.en) ||
        s.variants.some((v) => hit(v.label?.de) || hit(v.label?.en)),
    )
    .filter((s) => !filter.bookableOnly || isBookableOnline(s))
    .filter((s) => !filter.maxPriceCents || s.variants.some((v) => v.priceCents <= filter.maxPriceCents!))
    .filter((s) => !filter.maxMinutes || s.variants.some((v) => v.minutes !== null && v.minutes <= filter.maxMinutes!));
}

export async function getService(db: DbOrTx, id: string, opts: { includeHidden?: boolean } = {}): Promise<ServiceWithVariants | null> {
  const [s] = await db.select().from(schema.services).where(eq(schema.services.id, id));
  if (!s || (!opts.includeHidden && !s.visible)) return null;
  const variants = await db
    .select()
    .from(schema.serviceVariants)
    .where(opts.includeHidden ? eq(schema.serviceVariants.serviceId, id) : and(eq(schema.serviceVariants.serviceId, id), eq(schema.serviceVariants.active, true)));
  const [image] = s.imageAssetId ? await db.select().from(schema.assets).where(eq(schema.assets.id, s.imageAssetId)) : [];
  return { ...s, variants: variants.sort(byOrder), image: image ?? null };
}

/** Server-authoritative variant lookup. Never trust prices sent by a client or a model. */
export async function resolveVariant(db: DbOrTx, serviceId: string, variantId: string) {
  const service = await getService(db, serviceId);
  if (!service) throw new DomainError("service_not_found", 404);
  const variant = service.variants.find((v) => v.id === variantId);
  if (!variant) throw new DomainError("variant_not_found", 404);
  return { service, variant };
}

/** Like resolveVariant, but only for rows that can be booked online (bookable service, published duration). */
export async function resolveBookableVariant(db: DbOrTx, serviceId: string, variantId: string) {
  const { service, variant } = await resolveVariant(db, serviceId, variantId);
  if (!service.bookable || service.isAddon || !isTimed(variant)) throw new DomainError("service_not_bookable", 409);
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

/** null when the offer is unknown or one of its treatments is no longer offered online. */
export async function getOffer(db: DbOrTx, id: string, now = new Date()) {
  const [offer] = await db.select().from(schema.offers).where(eq(schema.offers.id, id));
  if (!offer) return null;
  const components = [];
  for (const c of offer.components) {
    try {
      components.push(await resolveBookableVariant(db, c.serviceId, c.variantId));
    } catch (error) {
      if (error instanceof DomainError) return null;
      throw error;
    }
  }
  const assets = offer.imageAssetId ? await db.select().from(schema.assets).where(eq(schema.assets.id, offer.imageAssetId)) : [];
  return { offer, components, current: offerIsCurrent(offer, now), image: assets[0] ?? null };
}

export type Quote = {
  kind: "service" | "offer";
  /** minutes null = no published duration (price-list row, not bookable online). */
  items: { serviceId: string; variantId: string; name: { de: string; en: string }; minutes: number | null; priceCents: number; priceFrom: boolean }[];
  totalCents: number;
  /** true when the total is a starting price ("ab"). */
  priceFrom: boolean;
  treatmentMinutes: number | null;
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
        name: variantName(service, variant),
        minutes: variant.minutes,
        priceCents: variant.priceCents,
        priceFrom: variant.priceFrom,
      })),
      totalCents: found.offer.priceCents,
      priceFrom: false,
      treatmentMinutes: found.offer.treatmentMinutes,
      currency: settings.currency,
      bookingMode: found.offer.bookingMode,
    };
  }
  if (!input.serviceId || !input.variantId) throw new DomainError("invalid_quote_request");
  const { service, variant } = await resolveVariant(db, input.serviceId, input.variantId);
  const online = service.bookable && !service.isAddon && isTimed(variant);
  return {
    kind: "service",
    items: [{ serviceId: service.id, variantId: variant.id, name: variantName(service, variant), minutes: variant.minutes, priceCents: variant.priceCents, priceFrom: variant.priceFrom }],
    totalCents: variant.priceCents,
    priceFrom: variant.priceFrom,
    treatmentMinutes: variant.minutes,
    currency: settings.currency,
    bookingMode: online ? settings.bookingMode : "not_bookable",
  };
}
