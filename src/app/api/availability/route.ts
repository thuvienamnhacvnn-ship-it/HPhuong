import { clientIp, rateLimit, route } from "@/lib/http";
import { getAvailability } from "@/lib/scheduling";
import { DomainError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = route(async (request, db) => {
  rateLimit(`avail:${clientIp(request)}`, 120, 60_000);
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  if (!from) throw new DomainError("invalid_date");
  const result = await getAvailability(db, {
    serviceId: url.searchParams.get("service") ?? undefined,
    variantId: url.searchParams.get("variant") ?? undefined,
    offerId: url.searchParams.get("offer") ?? undefined,
    staffId: url.searchParams.get("staff") || null,
    ownHoldToken: request.headers.get("x-hold-token"),
    from,
    days: Number(url.searchParams.get("days") ?? 1),
  });
  return {
    days: result.days,
    staff: result.staff,
    totalCents: result.plan.totalCents,
    treatmentMinutes: result.plan.treatmentMinutes,
    bookingMode: result.plan.bookingMode,
  };
});
