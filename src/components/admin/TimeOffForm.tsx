"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../api";
import { adminError } from "./ActionButton";

export function TimeOffForm({ today, resources }: { today: string; resources: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({ resourceId: "", date: today, from: "09:00", toDate: today, to: "18:00", reason: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="stack-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        try {
          const r = await api<{ conflictingAppointments: string[] }>("/api/admin/time-off", { body: { ...f, resourceId: f.resourceId || null, reason: f.reason || null } });
          setMsg(
            r.conflictingAppointments.length
              ? { ok: false, text: `Gespeichert. Achtung: ${r.conflictingAppointments.length} bestehende(r) Termin(e) überschneiden sich — bitte in „Anfragen & Termine“ verschieben.` }
              : { ok: true, text: "Blockierung gespeichert." },
          );
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: adminError(err) });
        }
      }}
    >
      <div className="field">
        <label htmlFor="to-r">Betrifft</label>
        <select id="to-r" className="select" value={f.resourceId} onChange={set("resourceId")}>
          <option value="">Ganzes Studio (geschlossen)</option>
          {resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div className="inline-form">
        <div className="field"><label htmlFor="to-d">Von (Datum)</label><input id="to-d" className="input" type="date" value={f.date} onChange={set("date")} /></div>
        <div className="field"><label htmlFor="to-f">Uhrzeit</label><input id="to-f" className="input" type="time" value={f.from} onChange={set("from")} /></div>
        <div className="field"><label htmlFor="to-td">Bis (Datum)</label><input id="to-td" className="input" type="date" value={f.toDate} onChange={set("toDate")} /></div>
        <div className="field"><label htmlFor="to-t">Uhrzeit</label><input id="to-t" className="input" type="time" value={f.to} onChange={set("to")} /></div>
      </div>
      <div className="field"><label htmlFor="to-re">Grund (intern)</label><input id="to-re" className="input" value={f.reason} onChange={set("reason")} maxLength={200} placeholder="z. B. Urlaub, Wartung" /></div>
      {msg && <p className={`notice ${msg.ok ? "notice--ok" : "notice--warn"}`} role="status">{msg.text}</p>}
      <button className="btn btn--sm" type="submit" style={{ justifySelf: "start" }}>Blockieren</button>
    </form>
  );
}
