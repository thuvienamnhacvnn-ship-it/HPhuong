"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { formatPrice } from "@/lib/money";
import { api } from "./api";
import { IconInfo, IconLotus, IconSend, IconUser } from "./icons";
import { RecCard, type RecCardData } from "./RecCard";

type Turn = { role: "user" | "assistant"; text: string; cards?: RecCardData[]; handoff?: boolean };
type Reply = { mode: "ai" | "unavailable"; text: string; cards: RecCardData[]; handoff: boolean };

export function AssistantChat({ locale, compact = false, onCards }: { locale: Locale; compact?: boolean; onCards?: (cards: RecCardData[]) => void }) {
  const t = getDict(locale);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    api<{ enabled: boolean }>("/api/assistant")
      .then((r) => setEnabled(r.enabled))
      .catch(() => setEnabled(false));
  }, []);

  if (enabled === null) return <p className="muted" role="status">{t.common.loading}</p>;
  if (!enabled || unavailable) {
    return (
      <div className="stack">
        {unavailable && <p className="notice notice--warn" role="status">{t.assistant.unavailable}</p>}
        <Chooser locale={locale} compact={compact} onCards={onCards} />
      </div>
    );
  }
  return <Chat locale={locale} compact={compact} onCards={onCards} onUnavailable={() => setUnavailable(true)} />;
}

function Chat({ locale, compact, onCards, onUnavailable }: { locale: Locale; compact: boolean; onCards?: (c: RecCardData[]) => void; onUnavailable: () => void }) {
  const t = getDict(locale);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: Turn[] = [...turns, { role: "user", text: clean }];
    setTurns(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await api<Reply>("/api/assistant", { body: { locale, turns: next.map(({ role, text }) => ({ role, text })) } });
      if (reply.mode === "unavailable") {
        onUnavailable();
        return;
      }
      const assistantTurn: Turn = { role: "assistant", text: reply.text || (reply.cards.length ? "" : t.assistant.nothing), cards: reply.cards, handoff: reply.handoff };
      setTurns([...next, assistantTurn]);
      if (reply.cards.length) onCards?.(reply.cards);
    } catch {
      onUnavailable();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <p className="small muted row" style={{ gap: 8 }}>
        <IconInfo width={18} height={18} /> {t.assistant.aiLabel}
      </p>
      <div className="chat__log" ref={logRef} aria-live="polite">
        <div className="bubble">
          <span className="bubble__avatar"><IconLotus /></span>
          <div className="bubble__text">
            <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem" }}>{t.assistant.greeting}</strong>
            <br />
            {t.assistant.greetingSub}
          </div>
        </div>
        {turns.length === 0 && (
          <div className="chip-row" style={{ paddingLeft: compact ? 0 : 68 }}>
            {Object.entries(t.assistant.chips).map(([k, label]) => (
              <button key={k} type="button" className="chip" onClick={() => send(label)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <div key={i} className="bubble bubble--user">
              <div className="bubble__text">{turn.text}</div>
              <span className="bubble__avatar" aria-hidden><IconUser /></span>
              <span className="sr-only">{t.assistant.you}</span>
            </div>
          ) : (
            <div key={i} className="stack-sm">
              {turn.text && (
                <div className="bubble">
                  <span className="bubble__avatar"><IconLotus /></span>
                  <div className="bubble__text">{turn.text}</div>
                </div>
              )}
              {turn.handoff && (
                <p className="notice notice--warn">
                  {t.assistant.handoff} <Link className="link" href={`/${locale}/kontakt`}>{t.assistant.toContact}</Link>
                </p>
              )}
              {compact && turn.cards && turn.cards.length > 0 && (
                <div className="rec-grid">{turn.cards.map((c) => <RecCard key={`${c.serviceId}-${c.variantId}`} card={c} locale={locale} />)}</div>
              )}
            </div>
          ),
        )}
        {busy && (
          <p className="row muted" role="status">
            <span className="spin" /> {t.assistant.thinking}
          </p>
        )}
      </div>
      <form
        className="chat__form"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label className="sr-only" htmlFor="assistant-input">{t.assistant.placeholder}</label>
        <input id="assistant-input" value={input} maxLength={1000} onChange={(e) => setInput(e.target.value)} placeholder={t.assistant.placeholder} autoComplete="off" />
        <button className="chat__send" type="submit" disabled={busy || !input.trim()}>
          <IconSend />
          <span className="sr-only">{t.assistant.send}</span>
        </button>
      </form>
      <p className="small muted row" style={{ gap: 8 }}>
        <IconInfo width={18} height={18} /> {t.assistant.noMedical}
      </p>
    </div>
  );
}

const TIME_OPTIONS = [null, 45, 60, 90];
const BUDGET_OPTIONS = [null, 5000, 8000, 10000];

function Chooser({ locale, compact, onCards }: { locale: Locale; compact: boolean; onCards?: (c: RecCardData[]) => void }) {
  const t = getDict(locale);
  const [goal, setGoal] = useState<string>("entspannung");
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [result, setResult] = useState<{ within: RecCardData[]; aboveBudget: RecCardData[] } | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(false);
    try {
      const r = await api<{ within: RecCardData[]; aboveBudget: RecCardData[] }>("/api/assistant/choose", { body: { goal, maxMinutes, budgetCents: budget } });
      setResult(r);
      onCards?.(r.within.length ? r.within : r.aboveBudget);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const chips = { ...t.assistant.chips };
  return (
    <div className="chooser">
      <p className="small muted row" style={{ gap: 8 }}>
        <IconInfo width={18} height={18} /> {t.assistant.demoLabel}
      </p>
      <fieldset>
        <legend>{t.assistant.goal}</legend>
        <div className="chip-row">
          {Object.entries(chips).map(([k, label]) => (
            <button key={k} type="button" className="chip" aria-pressed={goal === k} onClick={() => setGoal(k)}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{t.assistant.time}</legend>
        <div className="chip-row">
          {TIME_OPTIONS.map((m) => (
            <button key={String(m)} type="button" className="chip" aria-pressed={maxMinutes === m} onClick={() => setMaxMinutes(m)}>
              {m ? t.assistant.upTo(`${m} ${t.common.min}`) : t.assistant.anyTime}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{t.assistant.budget}</legend>
        <div className="chip-row">
          {BUDGET_OPTIONS.map((b) => (
            <button key={String(b)} type="button" className="chip" aria-pressed={budget === b} onClick={() => setBudget(b)}>
              {b ? t.assistant.upTo(formatPrice(b, locale)) : t.assistant.anyBudget}
            </button>
          ))}
        </div>
      </fieldset>
      <button type="button" className="btn" onClick={run} disabled={busy}>
        {busy ? <span className="spin" /> : null} {t.assistant.showSuggestions}
      </button>
      {error && <p className="notice notice--danger" role="alert">{t.common.genericError}</p>}
      <div aria-live="polite">
        {result && (
          <div className="stack">
            {result.within.length === 0 && result.aboveBudget.length > 0 && <p className="notice">{t.assistant.nothingWithin}</p>}
            {result.within.length === 0 && result.aboveBudget.length === 0 && <p className="notice">{t.assistant.nothing}</p>}
            {(compact || !onCards) && (
              <div className="rec-grid">
                {[...result.within, ...result.aboveBudget].map((c) => (
                  <RecCard key={`${c.serviceId}-${c.variantId}`} card={c} locale={locale} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <p className="small muted row" style={{ gap: 8 }}>
        <IconInfo width={18} height={18} /> {t.assistant.noMedical}
      </p>
    </div>
  );
}
