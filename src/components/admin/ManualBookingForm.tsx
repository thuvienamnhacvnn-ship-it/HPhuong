"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../api";
import { adminError } from "./ActionButton";

type Service = { id: string; name: string; variants: { id: string; minutes: number; priceCents: number }[] };

export function ManualBookingForm({ today, services, staff }: { today: string; services: Service[]; staff: { id: string; name: string }[] }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const service = services.find((s) => s.id === serviceId);
  const [variantId, setVariantId] = useState(service?.variants[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [staffId, setStaffId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!serviceId || !variantId || !date) return;
    api<{ days: { slots: { time: string }[] }[] }>(`/api/admin/availability?service=${serviceId}&variant=${variantId}&from=${date}${staffId ? `&staff=${staffId}` : ""}`)
      .then((r) => setSlots(r.days[0]?.slots.map((s) => s.time) ?? []))
      .catch(() => setSlots([]));
  }, [serviceId, variantId, date, staffId]);

  return (
    <form
      className="stack-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          await api("/api/admin/appointments/manual", {
            body: { serviceId, variantId, date, time, staffId: staffId || null, name, email, phone: phone || null, note: note || null, locale: "de" },
          });
          setMsg({ ok: true, text: "Termin angelegt und bestätigt." });
          setName("");
          setEmail("");
          setPhone("");
          setNote("");
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: adminError(err) });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="inline-form">
        <div className="field">
          <label htmlFor="mb-s">Behandlung</label>
          <select id="mb-s" className="select" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setVariantId(services.find((s) => s.id === e.target.value)?.variants[0]?.id ?? ""); setTime(""); }}>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="mb-v">Dauer</label>
          <select id="mb-v" className="select" value={variantId} onChange={(e) => { setVariantId(e.target.value); setTime(""); }}>
            {service?.variants.map((v) => <option key={v.id} value={v.id}>{v.minutes} Min. · {(v.priceCents / 100).toFixed(0)} €</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="mb-d">Datum</label>
          <input id="mb-d" className="input" type="date" min={today} value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} />
        </div>
        <div className="field">
          <label htmlFor="mb-st">Mitarbeitende</label>
          <select id="mb-st" className="select" value={staffId} onChange={(e) => { setStaffId(e.target.value); setTime(""); }}>
            <option value="">Keine Präferenz</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="mb-t">Uhrzeit</label>
          <select id="mb-t" className="select" value={time} onChange={(e) => setTime(e.target.value)} required>
            <option value="">{slots.length ? "wählen" : "keine frei"}</option>
            {slots.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="inline-form">
        <div className="field"><label htmlFor="mb-n">Name</label><input id="mb-n" className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field"><label htmlFor="mb-e">E-Mail</label><input id="mb-e" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="field"><label htmlFor="mb-p">Telefon</label><input id="mb-p" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      </div>
      <div className="field"><label htmlFor="mb-no">Notiz</label><input id="mb-no" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></div>
      {msg && <p className={`notice ${msg.ok ? "notice--ok" : "notice--danger"}`} role="status">{msg.text}</p>}
      <button className="btn btn--sm" type="submit" disabled={busy || !time} style={{ justifySelf: "start" }}>
        {busy && <span className="spin" />} Anlegen
      </button>
    </form>
  );
}
