"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "../api";

const MESSAGES: Record<string, string> = {
  slot_unavailable: "Dieser Zeitraum ist nicht (mehr) frei.",
  appointment_not_pending: "Die Anfrage ist nicht mehr offen.",
  appointment_request_expired: "Die Anfrage ist bereits abgelaufen.",
  appointment_not_cancellable: "Nicht stornierbar.",
  appointment_already_started: "Termin hat bereits begonnen.",
  insufficient_balance: "Guthaben reicht nicht.",
  voucher_not_found: "Gutschein nicht gefunden.",
  voucher_not_active: "Gutschein ist nicht aktiv.",
  voucher_partially_redeemed: "Gutschein wurde teilweise eingelöst — Teilerstattung bewusst bestätigen.",
  order_not_refundable: "Bestellung ist nicht erstattbar.",
  forbidden: "Keine Berechtigung für diese Aktion.",
  unauthorized: "Bitte erneut anmelden.",
  invalid_date: "Ungültiges Datum.",
  slot_in_past: "Zeitpunkt liegt in der Vergangenheit.",
  invalid_input: "Eingaben prüfen.",
  note_required: "Bitte Begründung angeben.",
  offline: "Keine Verbindung.",
};

export const adminError = (e: unknown) => (e instanceof ApiError ? (MESSAGES[e.code] ?? `Fehler: ${e.code}`) : "Unerwarteter Fehler.");

type Props = {
  url: string;
  method?: string;
  body?: unknown;
  label: string;
  confirm?: string;
  variant?: "primary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md";
  onDone?: (data: unknown) => void;
};

/** Server action button with inline confirmation (no browser dialogs) and real result only. */
export function ActionButton({ url, method = "POST", body, label, confirm, variant = "primary", size = "sm", onDone }: Props) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cls = `btn ${size === "sm" ? "btn--sm" : ""} ${variant === "primary" ? "" : `btn--${variant}`}`;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const data = await api(url, { method, body: body ?? {} });
      setAsking(false);
      onDone?.(data);
      router.refresh();
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  }

  if (confirm && asking) {
    return (
      <span className="stack-sm" role="alertdialog" aria-label={confirm}>
        <span className="small" style={{ fontWeight: 600 }}>{confirm}</span>
        <span className="row" style={{ gap: 8 }}>
          <button type="button" className={cls} onClick={run} disabled={busy}>
            {busy && <span className="spin" />} Ja
          </button>
          <button type="button" className="btn btn--sm btn--outline" onClick={() => setAsking(false)} autoFocus>
            Nein
          </button>
        </span>
        {error && <span className="error-text">{error}</span>}
      </span>
    );
  }
  return (
    <span className="stack-sm">
      <button type="button" className={cls} disabled={busy} onClick={() => (confirm ? setAsking(true) : run())}>
        {busy && <span className="spin" />} {label}
      </button>
      {error && <span className="error-text" role="alert">{error}</span>}
    </span>
  );
}
