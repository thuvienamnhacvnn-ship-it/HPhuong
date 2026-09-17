"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "../api";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/api/admin/login", { body: { email, password } });
          router.replace("/admin");
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiError && err.code === "rate_limited" ? "Zu viele Versuche. Bitte später erneut." : "E-Mail oder Passwort ist falsch.");
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="a-email">E-Mail</label>
        <input id="a-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="a-pass">Passwort</label>
        <input id="a-pass" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p className="notice notice--danger" role="alert">{error}</p>}
      <button className="btn btn--block" type="submit" disabled={busy}>
        {busy && <span className="spin" />} Anmelden
      </button>
    </form>
  );
}
