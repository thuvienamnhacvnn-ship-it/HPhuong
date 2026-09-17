/**
 * Business-zone time helpers without a date library.
 *
 * Everything is stored as UTC instants; the studio's wall clock lives in one
 * IANA zone (Europe/Berlin). Conversions go through Intl so daylight-saving
 * transitions are handled by the platform's tz database.
 */

export type LocalParts = { date: string; time: string; weekday: number; minutes: number };

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function partsOf(instant: Date, tz: string) {
  return Object.fromEntries(dtf(tz).formatToParts(instant).map((p) => [p.type, p.value]));
}

export function toLocalParts(instant: Date, tz: string): LocalParts {
  const p = partsOf(instant, tz);
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    weekday: WEEKDAYS[p.weekday],
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

/** Offset of `tz` from UTC at `instant`, in minutes (Berlin summer = +120). */
export function offsetMinutes(instant: Date, tz: string): number {
  const p = partsOf(instant, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/**
 * Wall-clock date + time in `tz` → UTC instant.
 * Returns null for wall times that do not exist (spring-forward gap).
 * For ambiguous autumn times the earlier (summer-time) instant wins.
 */
export function zonedToUtc(date: string, time: string, tz: string): Date | null {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wanted = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const candidates = new Set<number>();
  for (const probe of [guess - 3 * 3600_000, guess, guess + 3 * 3600_000]) {
    candidates.add(guess - offsetMinutes(new Date(probe), tz) * 60000);
  }
  const valid = [...candidates]
    .sort((a, b) => a - b)
    .filter((c) => {
      const p = toLocalParts(new Date(c), tz);
      return p.date === date && p.time === wanted;
    });
  return valid.length ? new Date(valid[0]) : null;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function minutesToTime(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60000);

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();

/** "Blocks forever" instant for confirmed bookings (Postgres-safe). */
export const FOREVER = new Date("9999-12-31T00:00:00Z");

export function formatLocalDate(instant: Date, tz: string, locale: "de" | "en", withWeekday = true) {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    timeZone: tz,
    weekday: withWeekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(instant);
}

export function formatLocalTime(instant: Date, tz: string, locale: "de" | "en") {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}
