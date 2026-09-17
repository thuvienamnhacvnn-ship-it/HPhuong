"use client";

import { useState } from "react";
import { api } from "../api";
import { adminError } from "./ActionButton";

export function TeamNote({ initial, canEdit }: { initial: string; canEdit: boolean }) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  if (!editing) {
    return (
      <div className="stack-sm">
        <p className="pre" style={{ fontFamily: "inherit" }}>{value || "—"}</p>
        {canEdit && (
          <button type="button" className="btn btn--sm btn--outline" style={{ justifySelf: "start" }} onClick={() => setEditing(true)}>
            Bearbeiten
          </button>
        )}
        {status && <span className="small">{status}</span>}
      </div>
    );
  }
  return (
    <form
      className="stack-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api("/api/admin/settings", { method: "PATCH", body: { teamNote: value } });
          setStatus("Gespeichert.");
          setEditing(false);
        } catch (err) {
          setStatus(adminError(err));
        }
      }}
    >
      <label className="sr-only" htmlFor="team-note">Hinweis</label>
      <textarea id="team-note" className="textarea" value={value} onChange={(e) => setValue(e.target.value)} maxLength={500} />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn--sm" type="submit">Speichern</button>
        <button className="btn btn--sm btn--outline" type="button" onClick={() => setEditing(false)}>Abbrechen</button>
      </div>
    </form>
  );
}
