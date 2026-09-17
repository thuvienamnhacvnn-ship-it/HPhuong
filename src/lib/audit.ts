import type { DbOrTx } from "./db";
import { schema } from "./db";
import { newId } from "./ids";

/** Append-only audit trail. Never put customer contact data or voucher codes in `details`. */
export async function audit(db: DbOrTx, actor: string, action: string, entity: string, entityId?: string | null, details?: Record<string, unknown>) {
  await db.insert(schema.auditLog).values({ id: newId("aud"), actor, action, entity, entityId: entityId ?? null, details: details ?? null });
}
