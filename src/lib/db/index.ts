// No `server-only` here: CLI scripts and tests import this module directly.
// It is never imported from a client component.
import path from "node:path";
import fs from "node:fs";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

export { schema };
export type Db = PgliteDatabase<typeof schema>;
/** A transaction handle has the same query surface as the database. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

/**
 * Development runs on PGlite (Postgres compiled to WASM) because this machine
 * cannot run a native Postgres. Setting DATABASE_URL switches to real Postgres;
 * schema and queries are identical.
 *
 * PGlite trap: inside `db.transaction(tx => …)` ALWAYS use `tx`. Calling the
 * outer `db` from inside a transaction waits for the transaction lock forever.
 */
const DATA_DIR = process.env.PGLITE_DATA_DIR
  ? path.resolve(process.env.PGLITE_DATA_DIR)
  : path.resolve(process.cwd(), "data", "pgdata");

declare global {
  var __hphuong_db: Promise<Db> | undefined;
}

async function create(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const [{ drizzle }, pg] = await Promise.all([import("drizzle-orm/node-postgres"), import("pg")]);
    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
    return drizzle(pool, { schema }) as unknown as Db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  claimDataDir();
  const client = await PGlite.create({ dataDir: DATA_DIR });
  return drizzlePglite(client, { schema });
}

/** In-memory database with all migrations applied — used by tests. */
export async function createMemoryDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const client = await PGlite.create();
  const db = drizzlePglite(client, { schema });
  await applyMigrations(db, () => {});
  return db;
}

/**
 * PGlite data directories belong to exactly one process. A running `next dev`
 * plus `npm run seed` in another terminal corrupts the data. Refuse to open
 * while the owner PID is alive.
 */
function claimDataDir() {
  const lockPath = path.join(DATA_DIR, ".hphuong-lock");
  try {
    const owner = Number(fs.readFileSync(lockPath, "utf8").split("\n")[0]);
    if (Number.isInteger(owner) && owner !== process.pid) {
      let alive = false;
      try {
        process.kill(owner, 0);
        alive = true;
      } catch {
        alive = false;
      }
      if (alive) {
        throw new Error(
          `PGlite data dir ${DATA_DIR} is open in process ${owner}.\n` +
            "Stop the dev server before running db:push / seed, or point PGLITE_DATA_DIR elsewhere.",
        );
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" && error instanceof Error && error.message.includes("is open in process")) {
      throw error;
    }
  }
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(lockPath, `${process.pid}\n${new Date().toISOString()}\n`);
  const release = () => {
    try {
      if (Number(fs.readFileSync(lockPath, "utf8").split("\n")[0]) === process.pid) fs.unlinkSync(lockPath);
    } catch {
      /* already gone */
    }
  };
  process.once("exit", release);
}

export function getDb(): Promise<Db> {
  if (!globalThis.__hphuong_db) globalThis.__hphuong_db = create();
  return globalThis.__hphuong_db;
}

export function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] })?.rows ?? []) as T[];
}

/** Apply drizzle/*.sql in order, recording applied files. */
export async function applyMigrations(db: Db, log: (line: string) => void = console.log) {
  const dir = path.resolve(process.cwd(), "drizzle");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  await db.execute(sql`CREATE TABLE IF NOT EXISTS __hphuong_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set(rowsOf<{ name: string }>(await db.execute(sql`SELECT name FROM __hphuong_migrations`)).map((r) => r.name));
  for (const file of files) {
    if (done.has(file)) continue;
    const statements = fs
      .readFileSync(path.join(dir, file), "utf8")
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const statement of statements) await db.execute(sql.raw(statement));
    await db.execute(sql`INSERT INTO __hphuong_migrations (name) VALUES (${file})`);
    log(`  applied ${file} (${statements.length} statements)`);
  }
}
