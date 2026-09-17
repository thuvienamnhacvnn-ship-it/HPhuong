"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { api, errorText } from "./api";

export function SandboxButtons({ locale, sessionId }: { locale: Locale; sessionId: string }) {
  const t = getDict(locale);
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(outcome: "succeeded" | "failed" | "cancelled") {
    setBusy(outcome);
    setError(null);
    try {
      const r = await api<{ orderToken: string | null }>("/api/payments/sandbox", { body: { sessionId, outcome } });
      if (outcome === "cancelled") router.replace(`/${locale}/checkout`);
      else if (r.orderToken) router.replace(`/${locale}/bestellung/${r.orderToken}`);
    } catch (e) {
      setError(errorText(t.errors, t.common.genericError, t.common.offline, e));
      setBusy(null);
    }
  }

  return (
    <div className="stack-sm">
      <button type="button" className="btn btn--lg btn--block" disabled={!!busy} onClick={() => go("succeeded")}>
        {busy === "succeeded" && <span className="spin" />} {t.sandbox.succeed}
      </button>
      <button type="button" className="btn btn--danger btn--block" disabled={!!busy} onClick={() => go("failed")}>
        {t.sandbox.fail}
      </button>
      <button type="button" className="btn btn--ghost btn--block" disabled={!!busy} onClick={() => go("cancelled")}>
        {t.sandbox.cancel}
      </button>
      {error && <p className="notice notice--danger" role="alert">{error}</p>}
    </div>
  );
}
