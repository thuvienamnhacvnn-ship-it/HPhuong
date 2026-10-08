import { route } from "@/lib/http";
import { isTimed, listOffers, listServices } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const GET = route(async (request, db) => {
  const url = new URL(request.url);
  const num = (k: string) => (url.searchParams.get(k) ? Number(url.searchParams.get(k)) : null);
  const services = await listServices(db, {
    category: url.searchParams.get("category"),
    q: url.searchParams.get("q"),
    maxPriceCents: num("maxPriceCents"),
    maxMinutes: num("maxMinutes"),
    bookableOnly: url.searchParams.get("bookable") === "1",
  });
  const offers = await listOffers(db);
  return {
    services: services.map((s) => ({
      id: s.id,
      category: s.category,
      name: s.name,
      teaser: s.teaser,
      imageAssetId: s.imageAssetId,
      bookable: s.bookable,
      isAddon: s.isAddon,
      // minutes null = no published duration; bookable = this row can be booked online
      variants: s.variants.map((v) => ({ id: v.id, label: v.label, minutes: v.minutes, priceCents: v.priceCents, priceFrom: v.priceFrom, bookable: s.bookable && !s.isAddon && isTimed(v) })),
    })),
    offers: offers.map((o) => ({ id: o.id, name: o.name, priceCents: o.priceCents, treatmentMinutes: o.treatmentMinutes, bookingMode: o.bookingMode })),
  };
});
