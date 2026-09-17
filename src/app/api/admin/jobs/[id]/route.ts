import { and, eq, inArray } from "drizzle-orm";
import { withParams } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
import { audit } from "@/lib/audit";
import { kick } from "@/lib/background";

/** Retry a failed notification. Same job row → same dedupe key → never a duplicate message. */
export const POST = withParams<{ id: string }>(async (_request, db, { id }) => {
  const user = await requireStaff("manager");
  await db
    .update(schema.notificationJobs)
    .set({ status: "queued", runAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.notificationJobs.id, id), inArray(schema.notificationJobs.status, ["failed"])));
  await audit(db, `usr:${user.id}`, "notification.retry", "notification_job", id);
  kick();
  return { ok: true };
});
