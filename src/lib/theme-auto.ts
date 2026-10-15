/**
 * Automatic day/night theme for Berlin: dark from sunset to sunrise (Europe/Berlin, 52.52 N 13.405 E).
 * Pure functions, shared by the server layout (first paint) and the client toggle (switch at the boundary).
 */
export type Theme = "light" | "dark";
export type ThemeChoice = "auto" | "light" | "dark";

const LAT = 52.52;
const LON = 13.405;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const mod = (v: number, m: number) => ((v % m) + m) % m;

/** NOAA/Almanac sunrise-sunset algorithm; returns the event as a Date on the UTC day of `day`. */
function sunEvent(day: Date, rising: boolean): Date {
  const start = Date.UTC(day.getUTCFullYear(), 0, 0);
  const n = Math.floor((Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) - start) / 86400000);
  const lngHour = LON / 15;
  const t = n + ((rising ? 6 : 18) - lngHour) / 24;
  const m = 0.9856 * t - 3.289;
  const l = mod(m + 1.916 * Math.sin(rad(m)) + 0.02 * Math.sin(rad(2 * m)) + 282.634, 360);
  let ra = mod(deg(Math.atan(0.91764 * Math.tan(rad(l)))), 360);
  ra += Math.floor(l / 90) * 90 - Math.floor(ra / 90) * 90;
  ra /= 15;
  const sinDec = 0.39782 * Math.sin(rad(l));
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(rad(90.833)) - sinDec * Math.sin(rad(LAT))) / (cosDec * Math.cos(rad(LAT)));
  const h = (rising ? 360 - deg(Math.acos(cosH)) : deg(Math.acos(cosH))) / 15;
  const ut = mod(h + ra - 0.06571 * t - 6.622 - lngHour, 24);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) + ut * 3600000);
}

export function isNight(now: Date = new Date()): boolean {
  return now < sunEvent(now, true) || now >= sunEvent(now, false);
}

/** Milliseconds until the theme next flips (at least 1 s). */
export function msUntilSwitch(now: Date = new Date()): number {
  const tomorrow = new Date(now.getTime() + 86400000);
  const candidates = [sunEvent(now, true), sunEvent(now, false), sunEvent(tomorrow, true)].filter((d) => d > now);
  return Math.max(1000, candidates[0].getTime() - now.getTime());
}

export function resolveTheme(choice: ThemeChoice, now: Date = new Date()): Theme {
  return choice === "auto" ? (isNight(now) ? "dark" : "light") : choice;
}

/** Cookie `hp-theme`: "light" | "dark" | "auto"; no cookie = auto. */
export function parseChoice(value: string | undefined): ThemeChoice {
  return value === "light" || value === "dark" ? value : "auto";
}
