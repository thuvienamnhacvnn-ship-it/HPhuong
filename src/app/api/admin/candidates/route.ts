import { route } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { requestCandidates } from "@/lib/scheduling";
import { DomainError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/** Possible chain start times for a combo request on one day. */
export const GET = route(async (request, db) => {
  await requireStaff("manager");
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const date = url.searchParams.get("date");
  if (!id || !date) throw new DomainError("invalid_input");
  return requestCandidates(db, id, date);
});
