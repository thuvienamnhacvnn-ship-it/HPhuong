import { route } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { getAvailability } from "@/lib/scheduling";
import { DomainError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** Staff view of free slots (for manual bookings and moving appointments). */
export const GET = route(async (request, db) => {
  await requireStaff("manager");
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  if (!from) throw new DomainError("invalid_date");
  const result = await getAvailability(db, {
    serviceId: url.searchParams.get("service") ?? undefined,
    variantId: url.searchParams.get("variant") ?? undefined,
    staffId: url.searchParams.get("staff") || null,
    from,
  });
  return { days: result.days, staff: result.staff };
});
