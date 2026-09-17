/**
 * Background loop inside the web process: sends due notifications and expires
 * undecided requests. For multi-instance deployments run `npm run worker`
 * separately and set INPROCESS_WORKER=0.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.INPROCESS_WORKER === "0") return;
  const g = globalThis as unknown as { __hphuongWorker?: NodeJS.Timeout };
  if (g.__hphuongWorker) return;
  const { tick } = await import("./lib/background");
  g.__hphuongWorker = setInterval(() => void tick().catch((e) => console.error("[worker]", (e as Error).message)), 30_000);
}
