import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { DomainError } from "./errors";
import { getDb, type Db } from "./db";

/* ------------------------------------------------------------ rate limit */

const buckets = new Map<string, number[]>();

/** Sliding window in process memory — fine for a single web process; swap for Redis when scaling out. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    throw new DomainError("rate_limited", 429);
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => t > now - windowMs)) buckets.delete(k);
}

/** Only trust X-Forwarded-For behind our own proxy (TRUST_PROXY=1); otherwise one shared bucket. */
export function clientIp(request: Request) {
  if (process.env.TRUST_PROXY !== "1") return "shared";
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/* ------------------------------------------------------------- handlers */

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError("invalid_json");
  }
  return schema.parse(body);
}

type Handler = (request: Request, db: Db) => Promise<Response | unknown>;

/** Uniform error mapping; unexpected errors are logged without request bodies. */
export function route(handler: Handler) {
  return async (request: Request) => {
    try {
      const db = await getDb();
      const result = await handler(request, db);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof DomainError) {
        return NextResponse.json({ error: error.code, ...(error.details ?? {}) }, { status: error.status });
      }
      if (error instanceof ZodError) {
        return NextResponse.json({ error: "invalid_input", issues: error.issues.map((i) => i.path.join(".")) }, { status: 400 });
      }
      console.error(`[api] ${new URL(request.url).pathname}:`, (error as Error).message);
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
  };
}

export function withParams<P>(handler: (request: Request, db: Db, params: P) => Promise<Response | unknown>) {
  return async (request: Request, ctx: { params: Promise<P> }) => {
    const params = await ctx.params;
    return route((req, db) => handler(req, db, params))(request);
  };
}
