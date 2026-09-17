import { and, eq, lt, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { expirePendingAppointments } from "./scheduling";
import { processDueJobs } from "./notifications/worker";
import { addMinutes } from "./time";

let running = false;

export async function tick(now = new Date()) {
  if (running) return;
  running = true;
  try {
    const db = await getDb();
    await expirePendingAppointments(db, now);
    // Jobs stuck in "sending" after a crash go back to the queue (dedupe keeps them single).
    await db
      .update(schema.notificationJobs)
      .set({ status: "queued", updatedAt: now })
      .where(and(eq(schema.notificationJobs.status, "sending"), lt(schema.notificationJobs.updatedAt, addMinutes(now, -10))));
    await processDueJobs(db, now);
    await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, now));
    await db.execute(sql`DELETE FROM magic_links WHERE expires_at < ${addMinutes(now, -24 * 60).toISOString()}`);
  } finally {
    running = false;
  }
}

/** Fire-and-forget nudge after an API call enqueued something. */
export function kick() {
  void tick().catch((e) => console.error("[worker]", (e as Error).message));
}
