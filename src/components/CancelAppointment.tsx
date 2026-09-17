"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { api, errorText } from "./api";

/** Cancel with an explicit confirmation step; only the server result changes the status. */
export function CancelAppointment({ locale, token, label }: { locale: Locale; token: string; label: string }) {
  const t = getDict(locale);
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button type="button" className="btn btn--outline" onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }
  return (
    <div className="stack-sm" role="alertdialog" aria-labelledby="cancel-q">
      <p id="cancel-q" style={{ margin: 0, fontWeight: 600 }}>{t.appointment.cancelQuestion}</p>
      <div className="row">
        <button
          type="button"
          className="btn btn--danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await api(`/api/appointments/${token}`, { method: "PATCH", body: { action: "cancel" } });
              router.refresh();
              setConfirming(false);
            } catch (e) {
              setError(errorText(t.errors, t.common.genericError, t.common.offline, e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <span className="spin" />} {t.appointment.cancelYes}
        </button>
        <button type="button" className="btn btn--outline" onClick={() => setConfirming(false)} autoFocus>
          {t.appointment.keep}
        </button>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
