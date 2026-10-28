/**
 * Automatic day/night theme: dark from 18:00 to 06:00 Berlin time, light from 06:00 to 18:00 (set by the owner).
 * Pure functions, shared by the server layout (first paint) and the client toggle (switch at the boundary).
 */
export type Theme = "light" | "dark";
export type ThemeChoice = "auto" | "light" | "dark";

const NIGHT_FROM = 18; // hour, Europe/Berlin
const NIGHT_TO = 6;

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

function berlinClock(now: Date) {
  const p = Object.fromEntries(clock.formatToParts(now).map((x) => [x.type, Number(x.value)]));
  return { h: p.hour, m: p.minute, s: p.second };
}

export function isNight(now: Date = new Date()): boolean {
  const { h } = berlinClock(now);
  return h >= NIGHT_FROM || h < NIGHT_TO;
}

/** Milliseconds until the theme next flips (1 s … 15 min; the client re-checks, so a clock change on a DST day is harmless). */
export function msUntilSwitch(now: Date = new Date()): number {
  const { h, m, s } = berlinClock(now);
  const into = h * 3600 + m * 60 + s; // seconds since Berlin midnight
  const targets = [NIGHT_TO * 3600, NIGHT_FROM * 3600, 24 * 3600 + NIGHT_TO * 3600];
  const next = targets.find((t) => t > into) ?? targets[2];
  return Math.min(15 * 60_000, Math.max(1000, (next - into) * 1000));
}

export function resolveTheme(choice: ThemeChoice, now: Date = new Date()): Theme {
  return choice === "auto" ? (isNight(now) ? "dark" : "light") : choice;
}

/** Cookie `hp-theme`: "light" | "dark" | "auto"; no cookie = auto. */
export function parseChoice(value: string | undefined): ThemeChoice {
  return value === "light" || value === "dark" ? value : "auto";
}
