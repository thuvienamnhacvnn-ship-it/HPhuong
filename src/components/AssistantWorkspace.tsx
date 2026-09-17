"use client";

import { useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { AssistantChat } from "./AssistantChat";
import { RecCard, type RecCardData } from "./RecCard";

/** Desktop layout of screen 09: conversation left, recommendation cards right. */
export function AssistantWorkspace({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [cards, setCards] = useState<RecCardData[]>([]);
  return (
    <div className="assistant-grid">
      <section className="card chat" aria-label={t.nav.assistant}>
        <AssistantChat locale={locale} onCards={setCards} />
      </section>
      <section aria-labelledby="rec-title" className="stack" aria-live="polite">
        <h2 id="rec-title">{t.assistant.recommendations}</h2>
        {cards.length === 0 ? (
          <p className="muted">{t.assistant.greetingSub}</p>
        ) : (
          <div className="rec-grid">
            {cards.map((c) => (
              <RecCard key={`${c.serviceId}-${c.variantId}`} card={c} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
