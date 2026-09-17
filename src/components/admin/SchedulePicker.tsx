"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../api";
import { adminError } from "./ActionButton";

type Mode =
  | { kind: "schedule"; appointmentId: string } // combo request → chain slots
  | { kind: "reschedule"; appointmentId: string; serviceId: string; variantId: string };

/** Pick a day, see engine-validated free starts, then place/move. The server re-validates on submit. */
export function SchedulePicker({ mode, today, label }: { mode: Mode; today: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(d: string) {
    setDate(d);
    setSlots(null);
    setError(null);
    try {
      const url =
        mode.kind === "schedule"
          ? `/api/admin/candidates?id=${mode.appointmentId}&date=${d}`
          : `/api/admin/availability?service=${mode.serviceId}&variant=${mode.variantId}&from=${d}`;
      const r = await api<{ slots?: { time: string }[]; days?: { slots: { time: string }[] }[] }>(url);
      setSlots((r.slots ?? r.days?.[0]?.slots ?? []).map((s) => s.time));
    } catch (e) {
      setError(adminError(e));
    }
  }

  async function place(time: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/appointments/${mode.appointmentId}`, { method: "PATCH", body: { action: mode.kind, date, time } });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(adminError(e));
      void load(date);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn--sm btn--outline" onClick={() => { setOpen(true); void load(date); }}>
        {label}
      </button>
    );
  }
  return (
    <div className="stack-sm" style={{ width: "100%" }}>
      <div className="inline-form">
        <div className="field">
          <label htmlFor={`d-${mode.appointmentId}`}>Datum</label>
          <input id={`d-${mode.appointmentId}`} className="input" type="date" min={today} value={date} onChange={(e) => load(e.target.value)} />
        </div>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setOpen(false)}>Schließen</button>
      </div>
      {slots === null && !error && <span className="small muted">Freie Zeiten werden geprüft …</span>}
      {slots && slots.length === 0 && <span className="small muted">Keine passende Zeit an diesem Tag.</span>}
      {slots && slots.length > 0 && (
        <div className="row" style={{ gap: 6 }}>
          {slots.map((s) => (
            <button key={s} type="button" className="chip" disabled={busy} onClick={() => place(s)} style={{ minHeight: 38, padding: "4px 12px", fontSize: "1rem" }}>
              {s}
            </button>
          ))}
        </div>
      )}
      {error && <span className="error-text" role="alert">{error}</span>}
    </div>
  );
}
