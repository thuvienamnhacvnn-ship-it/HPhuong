import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "./db";
import { getDb, schema } from "./db";
import { DomainError } from "./errors";
import { newId, newToken, seal, sha256, verifyPassword } from "./ids";
import { addMinutes } from "./time";
import { enqueue } from "./notifications/queue";
import { audit } from "./audit";

export const CUSTOMER_COOKIE = "hp_customer";
export const STAFF_COOKIE = "hp_staff";
const secure = process.env.NODE_ENV === "production";

export type Role = "owner" | "manager" | "therapist";
export type StaffUser = typeof schema.users.$inferSelect;
export type Customer = typeof schema.customers.$inferSelect;

async function createSession(db: Db, kind: "customer" | "staff", subjectId: string, hours: number) {
  const token = newToken();
  await db.insert(schema.sessions).values({ tokenHash: sha256(token), kind, subjectId, expiresAt: addMinutes(new Date(), hours * 60) });
  return token;
}

async function sessionSubject(db: Db, kind: "customer" | "staff", token: string | undefined) {
  if (!token) return null;
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.tokenHash, sha256(token)), eq(schema.sessions.kind, kind), gt(schema.sessions.expiresAt, new Date())));
  return session?.subjectId ?? null;
}

/* ---------------------------------------------------------------- customer */

/** Magic link: same response whether or not the e-mail is known (no account enumeration). */
export async function requestMagicLink(db: Db, email: string, locale: "de" | "en") {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new DomainError("invalid_email");
  const token = newToken();
  await db.insert(schema.magicLinks).values({ tokenHash: sha256(token), email: normalized, expiresAt: addMinutes(new Date(), 20) });
  const base = (process.env.APP_URL ?? "http://localhost:3035").replace(/\/$/, "");
  const link = `${base}/${locale}/login/verify?token=${token}`;
  await enqueue(db, {
    dedupeKey: `magic:${sha256(token)}:email`,
    channel: "email",
    template: "magic_link",
    recipient: normalized,
    locale,
    payload: { sealedLink: seal(link) },
    runAt: new Date(),
  });
}

export async function consumeMagicLink(db: Db, token: string, locale: "de" | "en") {
  return db.transaction(async (tx) => {
    const [link] = await tx
      .select()
      .from(schema.magicLinks)
      .where(and(eq(schema.magicLinks.tokenHash, sha256(token)), isNull(schema.magicLinks.usedAt), gt(schema.magicLinks.expiresAt, new Date())));
    if (!link) return null;
    await tx.update(schema.magicLinks).set({ usedAt: new Date() }).where(eq(schema.magicLinks.tokenHash, link.tokenHash));
    let [customer] = await tx.select().from(schema.customers).where(eq(schema.customers.email, link.email));
    if (!customer) {
      const id = newId("cus");
      await tx.insert(schema.customers).values({ id, email: link.email, name: link.email.split("@")[0], locale });
      [customer] = await tx.select().from(schema.customers).where(eq(schema.customers.id, id));
    }
    const sessionToken = newToken();
    await tx.insert(schema.sessions).values({ tokenHash: sha256(sessionToken), kind: "customer", subjectId: customer.id, expiresAt: addMinutes(new Date(), 30 * 24 * 60) });
    return { customer, sessionToken };
  });
}

export async function setCustomerCookie(token: string) {
  (await cookies()).set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 30 * 24 * 3600 });
}

export async function currentCustomer(): Promise<Customer | null> {
  const db = await getDb();
  const id = await sessionSubject(db, "customer", (await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!id) return null;
  const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, id));
  return customer ?? null;
}

/* ------------------------------------------------------------------- staff */

export async function staffLogin(db: Db, email: string, password: string) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.trim().toLowerCase()));
  // Always run the hash comparison to keep timing similar for unknown users.
  const ok = await verifyPassword(password, user?.passwordHash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !ok || !user.active) {
    await audit(db, "anonymous", "staff.login_failed", "user", user?.id ?? null);
    throw new DomainError("invalid_credentials", 401);
  }
  const token = await createSession(db, "staff", user.id, 12);
  await audit(db, `usr:${user.id}`, "staff.login", "user", user.id);
  (await cookies()).set(STAFF_COOKIE, token, { httpOnly: true, sameSite: "strict", secure, path: "/", maxAge: 12 * 3600 });
  return user;
}

export async function currentStaff(): Promise<StaffUser | null> {
  const db = await getDb();
  const id = await sessionSubject(db, "staff", (await cookies()).get(STAFF_COOKIE)?.value);
  if (!id) return null;
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return user?.active ? user : null;
}

const RANK: Record<Role, number> = { therapist: 1, manager: 2, owner: 3 };

/** For API routes: throws 401/403. Owner ⊃ manager ⊃ therapist. */
export async function requireStaff(minRole: Role = "therapist"): Promise<StaffUser> {
  const user = await currentStaff();
  if (!user) throw new DomainError("unauthorized", 401);
  if (RANK[user.role as Role] < RANK[minRole]) throw new DomainError("forbidden", 403);
  return user;
}

export const hasRole = (user: StaffUser, minRole: Role) => RANK[user.role as Role] >= RANK[minRole];

export async function logout(kind: "customer" | "staff") {
  const jar = await cookies();
  const name = kind === "customer" ? CUSTOMER_COOKIE : STAFF_COOKIE;
  const token = jar.get(name)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  }
  jar.delete(name);
}

/**
 * For admin pages. Layout and page render in parallel, so every page checks the
 * session itself instead of trusting the layout's redirect.
 */
export async function pageStaff(minRole: Role = "therapist"): Promise<StaffUser> {
  const user = await currentStaff();
  if (!user) redirect("/admin/login");
  if (RANK[user.role as Role] < RANK[minRole]) redirect("/admin");
  return user;
}
