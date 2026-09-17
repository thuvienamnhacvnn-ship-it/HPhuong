"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../api";
import { adminError } from "./ActionButton";

type Variant = { id: string; minutes: number; priceCents: number; active: boolean };
type Service = {
  id: string;
  name: string;
  category: string;
  visible: boolean;
  bookable: boolean;
  contentApproved: boolean;
  isDemo: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  roomTypes: string[];
  equipmentTypes: string[];
  videoUrl: string | null;
  teaser: { de: string; en: string };
  description: { de: string; en: string };
  variants: Variant[];
  skills: string[];
};

export function ServiceEditor({ service, staff, canEditPrices }: { service: Service; staff: { id: string; name: string }[]; canEditPrices: boolean }) {
  const router = useRouter();
  const [s, setS] = useState(service);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/admin/services/${s.id}`, {
        method: "PATCH",
        body: {
          visible: s.visible,
          bookable: s.bookable,
          contentApproved: s.contentApproved,
          bufferBeforeMinutes: s.bufferBeforeMinutes,
          bufferAfterMinutes: s.bufferAfterMinutes,
          videoUrl: s.videoUrl || null,
          teaser: s.teaser,
          description: s.description,
          skills: s.skills,
          ...(canEditPrices ? { variants: s.variants } : {}),
        },
      });
      setMsg({ ok: true, text: "Gespeichert." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: adminError(e) });
    } finally {
      setBusy(false);
    }
  }

  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));

  return (
    <details className="card card--pad">
      <summary style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.45rem" }}>{s.name}</strong>
        <span className="small muted">{s.variants.map((v) => `${v.minutes} Min. / ${(v.priceCents / 100).toFixed(2)} €`).join(" · ")}</span>
        {!s.visible && <span className="status status--cancelled">ausgeblendet</span>}
        {!s.bookable && <span className="status status--pending">nicht online buchbar</span>}
        {!s.contentApproved && <span className="badge">Text nicht freigegeben</span>}
        {s.isDemo && <span className="badge">Demo</span>}
      </summary>
      <div className="stack" style={{ marginTop: 16 }}>
        <div className="row">
          <label className="check"><input type="checkbox" checked={s.visible} onChange={(e) => setS({ ...s, visible: e.target.checked })} /><span>Auf der Website sichtbar</span></label>
          <label className="check"><input type="checkbox" checked={s.bookable} onChange={(e) => setS({ ...s, bookable: e.target.checked })} /><span>Online buchbar</span></label>
          <label className="check"><input type="checkbox" checked={s.contentApproved} onChange={(e) => setS({ ...s, contentApproved: e.target.checked })} /><span>Beschreibung freigegeben</span></label>
        </div>

        <fieldset className="stack-sm" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label">Varianten {canEditPrices ? "" : "(nur Inhaberin)"}</legend>
          {s.variants.map((v, i) => (
            <div key={v.id} className="inline-form">
              <div className="field"><label htmlFor={`${s.id}-m-${i}`}>Minuten</label><input id={`${s.id}-m-${i}`} className="input" type="number" min={5} disabled={!canEditPrices} value={v.minutes} onChange={(e) => setS({ ...s, variants: s.variants.map((x, j) => (j === i ? { ...x, minutes: num(e.target.value) } : x)) })} /></div>
              <div className="field"><label htmlFor={`${s.id}-p-${i}`}>Preis (€)</label><input id={`${s.id}-p-${i}`} className="input" type="number" min={0} step="0.01" disabled={!canEditPrices} value={(v.priceCents / 100).toFixed(2)} onChange={(e) => setS({ ...s, variants: s.variants.map((x, j) => (j === i ? { ...x, priceCents: Math.round(Number(e.target.value) * 100) } : x)) })} /></div>
              <label className="check"><input type="checkbox" disabled={!canEditPrices} checked={v.active} onChange={(e) => setS({ ...s, variants: s.variants.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)) })} /><span>aktiv</span></label>
            </div>
          ))}
        </fieldset>

        <div className="inline-form">
          <div className="field"><label htmlFor={`${s.id}-bb`}>Puffer davor (Min.)</label><input id={`${s.id}-bb`} className="input" type="number" min={0} max={120} value={s.bufferBeforeMinutes} onChange={(e) => setS({ ...s, bufferBeforeMinutes: num(e.target.value) })} /></div>
          <div className="field"><label htmlFor={`${s.id}-ba`}>Puffer danach (Min.)</label><input id={`${s.id}-ba`} className="input" type="number" min={0} max={120} value={s.bufferAfterMinutes} onChange={(e) => setS({ ...s, bufferAfterMinutes: num(e.target.value) })} /></div>
          <div className="field"><span className="label">Räume / Geräte</span><span className="small">{s.roomTypes.join(", ")}{s.equipmentTypes.length ? ` · ${s.equipmentTypes.join(", ")}` : ""}</span></div>
        </div>

        <fieldset className="row" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label">Qualifizierte Mitarbeitende</legend>
          {staff.map((m) => (
            <label key={m.id} className="check">
              <input type="checkbox" checked={s.skills.includes(m.id)} onChange={(e) => setS({ ...s, skills: e.target.checked ? [...s.skills, m.id] : s.skills.filter((x) => x !== m.id) })} />
              <span>{m.name}</span>
            </label>
          ))}
        </fieldset>

        <div className="grid-2">
          <div className="field"><label htmlFor={`${s.id}-td`}>Kurztext (DE)</label><input id={`${s.id}-td`} className="input" value={s.teaser.de} maxLength={200} onChange={(e) => setS({ ...s, teaser: { ...s.teaser, de: e.target.value } })} /></div>
          <div className="field"><label htmlFor={`${s.id}-te`}>Kurztext (EN)</label><input id={`${s.id}-te`} className="input" value={s.teaser.en} maxLength={200} onChange={(e) => setS({ ...s, teaser: { ...s.teaser, en: e.target.value } })} /></div>
          <div className="field"><label htmlFor={`${s.id}-dd`}>Beschreibung (DE)</label><textarea id={`${s.id}-dd`} className="textarea" value={s.description.de} maxLength={2000} onChange={(e) => setS({ ...s, description: { ...s.description, de: e.target.value } })} /></div>
          <div className="field"><label htmlFor={`${s.id}-de`}>Beschreibung (EN)</label><textarea id={`${s.id}-de`} className="textarea" value={s.description.en} maxLength={2000} onChange={(e) => setS({ ...s, description: { ...s.description, en: e.target.value } })} /></div>
        </div>
        <div className="field">
          <label htmlFor={`${s.id}-v`}>Video-URL (WebM/MP4, optional)</label>
          <input id={`${s.id}-v`} className="input" type="url" value={s.videoUrl ?? ""} onChange={(e) => setS({ ...s, videoUrl: e.target.value })} placeholder="leer = kein Video-Button" />
        </div>
        {msg && <p className={`notice ${msg.ok ? "notice--ok" : "notice--danger"}`} role="status">{msg.text}</p>}
        <button type="button" className="btn btn--sm" onClick={save} disabled={busy} style={{ justifySelf: "start" }}>
          {busy && <span className="spin" />} Speichern
        </button>
      </div>
    </details>
  );
}
