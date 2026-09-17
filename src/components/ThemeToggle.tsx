"use client";

import { useState } from "react";
import type { Locale } from "@/i18n";
import { IconMoon, IconSun } from "./icons";

export type Theme = "light" | "dark";

/** Light (Spa Atelier) ↔ dark (graphite & deep rose). Stored in a cookie so the server renders the right theme — no flash. */
export function ThemeToggle({ initial, locale, withLabel = false }: { initial: Theme; locale: Locale; withLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label =
    locale === "de"
      ? next === "dark" ? "Dunkles Design" : "Helles Design"
      : next === "dark" ? "Dark theme" : "Light theme";

  return (
    <button
      type="button"
      className={withLabel ? "chip" : "icon-btn"}
      aria-pressed={theme === "dark"}
      title={label}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        document.cookie = `hp-theme=${next}; path=/; max-age=31536000; samesite=lax`;
        setTheme(next);
      }}
    >
      {theme === "dark" ? <IconSun /> : <IconMoon />}
      {withLabel ? <span>{label}</span> : <span className="sr-only">{label}</span>}
    </button>
  );
}
