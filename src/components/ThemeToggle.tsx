"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n";
import { msUntilSwitch, resolveTheme, secondsToBoundary, THEME_COOKIE, type Theme, type ThemeChoice } from "@/lib/theme-auto";
import { IconAuto, IconMoon, IconSun } from "./icons";

export type { Theme };

const NEXT: Record<ThemeChoice, ThemeChoice> = { auto: "light", light: "dark", dark: "auto" };
const LABEL: Record<Locale, Record<ThemeChoice, string>> = {
  de: { auto: "Automatisch (18–6 Uhr dunkel, Berliner Zeit)", light: "Helles Design", dark: "Dunkles Design" },
  en: { auto: "Automatic (dark 6 pm–6 am, Berlin time)", light: "Light theme", dark: "Dark theme" },
};
const EVENT = "hp-theme-change";

/**
 * Three modes: automatic (dark from sunset to sunrise, Berlin time) → light → dark.
 * Stored in a cookie so the server renders the right theme without a flash; automatic mode flips
 * on its own at sunset/sunrise while the page is open.
 */
export function ThemeToggle({ choice: initial, locale, withLabel = false }: { choice: ThemeChoice; locale: Locale; withLabel?: boolean }) {
  const [choice, setChoice] = useState<ThemeChoice>(initial);

  useEffect(() => {
    const onChange = (e: Event) => setChoice((e as CustomEvent<ThemeChoice>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(choice);
    };
    apply();
    if (choice !== "auto") return;
    let timer = setTimeout(function tick() {
      apply();
      timer = setTimeout(tick, msUntilSwitch());
    }, msUntilSwitch());
    const onVisible = () => document.visibilityState === "visible" && apply();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [choice]);

  const label = LABEL[locale][choice];
  const Icon = choice === "auto" ? IconAuto : choice === "light" ? IconSun : IconMoon;

  return (
    <button
      type="button"
      className={withLabel ? "chip" : "icon-btn"}
      title={label}
      onClick={() => {
        const next = NEXT[choice];
        document.cookie = next === "auto" ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax` : `${THEME_COOKIE}=${next}; path=/; max-age=${secondsToBoundary()}; samesite=lax`;
        setChoice(next);
        window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
      }}
    >
      <Icon />
      {withLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </button>
  );
}
