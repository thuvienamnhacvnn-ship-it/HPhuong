/** Standalone worker for deployments with several web instances (set INPROCESS_WORKER=0 on the web side). */
import { tick } from "../src/lib/background";

console.log("HPHUONG worker running (30 s interval).");
await tick();
setInterval(() => void tick().catch((e) => console.error("[worker]", (e as Error).message)), 30_000);
