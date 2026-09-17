import { route } from "@/lib/http";
import { listOffers, listServices } from "@/lib/catalog";

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
      variants: s.variants.map((v) => ({ id: v.id, minutes: v.minutes, priceCents: v.priceCents })),
    })),
    offers: offers.map((o) => ({ id: o.id, name: o.name, priceCents: o.priceCents, treatmentMinutes: o.treatmentMinutes, bookingMode: o.bookingMode })),
  };
});
