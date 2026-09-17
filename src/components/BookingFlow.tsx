"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { getDict, type Locale } from "@/i18n";
import { formatPrice } from "@/lib/money";
import { api, ApiError, errorText } from "./api";
import { Img } from "./Img";
import { IconArrow, IconCalendar, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconInfo, IconMail, IconPhone, IconUser, IconWhatsapp } from "./icons";

export type BookingService = {
  id: string;
  name: { de: string; en: string };
  imageAssetId: string | null;
  variants: { id: string; minutes: number; priceCents: number }[];
};

type Day = { date: string; slots: { time: string; startsAt: string }[]; closed: boolean };
type Availability = { days: Day[]; staff: { id: string; name: string }[]; totalCents: number };
type Hold = { token: string; expiresAt: number; key: string };

type Props = {
  locale: Locale;
  services: BookingService[];
  today: string;
  lastDay: string;
  timezone: string;
  whatsappAvailable: boolean;
  initial: { service?: string; variant?: string; date?: string; time?: string; staff?: string };
};

function storedHold(): Hold | null {
  try {
    const h = JSON.parse(sessionStorage.getItem("hp-hold") ?? "null") as Hold | null;
    return h && h.expiresAt > Date.now() ? h : null;
  } catch {
    return null;
  }
}

function ownHoldHeader(inMemory: Hold | null): Record<string, string> | undefined {
  const token = inMemory?.token ?? storedHold()?.token;
  return token ? { "x-hold-token": token } : undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");
const monthOf = (date: string) => date.slice(0, 7);
function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
function daysInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function firstWeekday(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const w = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function BookingFlow({ locale, services, today, lastDay, timezone, whatsappAvailable, initial }: Props) {
  const t = getDict(locale);
  const router = useRouter();
  const pathname = usePathname();

  const initialService = services.find((s) => s.id === initial.service) ?? null;
  const [serviceId, setServiceId] = useState<string | null>(initialService?.id ?? null);
  const [variantId, setVariantId] = useState<string | null>(initialService?.variants.find((v) => v.id === initial.variant)?.id ?? initialService?.variants[0]?.id ?? null);
  const validInitialDate = initial.date && initial.date >= today && initial.date <= lastDay ? initial.date : null;
  const [date, setDate] = useState<string | null>(validInitialDate);
  const [month, setMonth] = useState(monthOf(validInitialDate ?? today));
  const [time, setTime] = useState<string | null>(validInitialDate ? (initial.time ?? null) : null);
  const [staffId, setStaffId] = useState<string>(initial.staff ?? "");
  const [step, setStep] = useState<1 | 2 | 3>(initialService ? (initial.time ? 3 : 2) : 1);

  const [avail, setAvail] = useState<Availability | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);

  const holdRef = useRef<Hold | null>(null);
  const [hold, setHoldState] = useState<Hold | null>(null);
  // Restore an active hold after reload (token is not personal data; contact fields are never stored).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("hp-hold");
      const h = raw ? (JSON.parse(raw) as Hold) : null;
      if (h && h.expiresAt > Date.now()) {
        holdRef.current = h;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage (external system)
        setHoldState(h);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);
  const setHold = useCallback((h: Hold | null) => {
    holdRef.current = h;
    setHoldState(h);
    try {
      if (h) sessionStorage.setItem("hp-hold", JSON.stringify(h));
      else sessionStorage.removeItem("hp-hold");
    } catch {
      /* storage unavailable: hold lives in memory only */
    }
  }, []);
  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const service = services.find((s) => s.id === serviceId) ?? null;
  const variant = service?.variants.find((v) => v.id === variantId) ?? null;

  const err = useCallback((e: unknown) => errorText(t.errors, t.common.genericError, t.common.offline, e), [t]);

  /* Selection (never contact data) lives in the URL: reload & Back/Forward keep it. */
  useEffect(() => {
    const qs = new URLSearchParams();
    if (serviceId) qs.set("service", serviceId);
    if (variantId) qs.set("variant", variantId);
    if (date) qs.set("date", date);
    if (time) qs.set("time", time);
    if (staffId) qs.set("staff", staffId);
    const next = `${pathname}${qs.toString() ? `?${qs}` : ""}`;
    // Native history API: updates the URL without a server round trip, focus or scroll jump.
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [serviceId, variantId, date, time, staffId, pathname]);

  /* Load availability for the visible month. */
  useEffect(() => {
    if (!serviceId || !variantId) return;
    const from = month === monthOf(today) ? today : `${month}-01`;
    const days = daysInMonth(month) - Number(from.slice(8)) + 1;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch started right here
    setLoadingAvail(true);
    setAvailError(null);
    api<Availability>(`/api/availability?service=${serviceId}&variant=${variantId}&from=${from}&days=${days}${staffId ? `&staff=${staffId}` : ""}`, { signal: controller.signal, headers: ownHoldHeader(holdRef.current) })
      .then((a) => setAvail(a))
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setAvailError(err(e));
      })
      .finally(() => setLoadingAvail(false));
    return () => controller.abort();
  }, [serviceId, variantId, month, staffId, today, err, reloadKey]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const day = useMemo(() => avail?.days.find((d) => d.date === date) ?? null, [avail, date]);

  /* If the chosen time vanished (variant/staff change, taken), clear it. */
  useEffect(() => {
    if (!avail || !date || !time) return;
    const inMonth = avail.days.some((d) => d.date === date);
    const ownKey = serviceId && variantId ? `${serviceId}|${variantId}|${date}|${time}|${staffId}` : null;
    const heldByMe = (holdRef.current ?? storedHold())?.key === ownKey;
    if (inMonth && !heldByMe && !day?.slots.some((s) => s.time === time)) {
      setTime(null);
      setHoldMessage(t.booking.slotTaken);
    }
  }, [avail, day, date, time, t, serviceId, variantId, staffId]);

  /* Hold countdown */
  useEffect(() => {
    if (!hold) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hold]);
  const holdLeftMin = hold ? Math.max(0, Math.ceil((hold.expiresAt - now) / 60000)) : 0;
  const holdExpired = !!hold && hold.expiresAt <= now;

  const selectionKey = serviceId && variantId && date && time ? `${serviceId}|${variantId}|${date}|${time}|${staffId}` : null;

  // One in-flight hold request per selection (StrictMode double effects, double clicks).
  const inflight = useRef<{ key: string; promise: Promise<Hold | null> } | null>(null);

  async function placeHoldNow(): Promise<Hold | null> {
    if (!selectionKey || !serviceId || !variantId || !date || !time) return null;
    const current = holdRef.current ?? storedHold();
    if (current && current.key === selectionKey && current.expiresAt > Date.now() + 5000) return current;
    try {
      const r = await api<{ holdToken: string; expiresAt: string }>("/api/holds", {
        body: { serviceId, variantId, date, time, staffId: staffId || null, previousHoldToken: current?.token },
      });
      const h = { token: r.holdToken, expiresAt: new Date(r.expiresAt).getTime(), key: selectionKey };
      setHold(h);
      holdRef.current = h;
      setHoldMessage(null);
      if (current?.key !== selectionKey) setReloadKey((k) => k + 1); // refetch so the list reflects our own hold
      return h;
    } catch (e) {
      setHold(null);
      if (e instanceof ApiError && e.code === "slot_unavailable") {
        setTime(null);
        setHoldMessage(t.booking.slotTaken);
        // refresh slots
        setReloadKey((k) => k + 1);
        setAvail((a) => (a ? { ...a, days: a.days.map((d) => (d.date === date ? { ...d, slots: d.slots.filter((s) => s.time !== time) } : d)) } : a));
      } else {
        setHoldMessage(err(e));
      }
      return null;
    }
  }

  function placeHold(): Promise<Hold | null> {
    if (!selectionKey) return Promise.resolve(null);
    if (inflight.current?.key === selectionKey) return inflight.current.promise;
    const promise = placeHoldNow().finally(() => {
      if (inflight.current?.promise === promise) inflight.current = null;
    });
    inflight.current = { key: selectionKey, promise };
    return promise;
  }

  const onSelectionChange = useEffectEvent(() => {
    void placeHold();
  });

  // Hold as soon as a time is chosen.
  useEffect(() => {
    if (selectionKey) onSelectionChange();
  }, [selectionKey]);

  // No release on page leave: a reload must keep the hold. Holds expire on their own (TTL) and
  // every new selection releases the previous one server-side.

  function chooseService(id: string) {
    const s = services.find((x) => x.id === id)!;
    setServiceId(id);
    setVariantId(s.variants[0].id);
    setTime(null);
    setHoldMessage(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const errors: Record<string, boolean> = {};
    if (!name.trim()) errors.name = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = true;
    if (whatsapp && !phone.trim()) errors.phone = true;
    setFieldErrors(errors);
    if (!service || !variant || !date || !time) {
      setFormError(t.booking.selectTimeFirst);
      setStep(2);
      return;
    }
    if (Object.keys(errors).length) {
      setFormError(errors.phone ? t.errors.phone_required_for_whatsapp : errors.email ? t.errors.invalid_email : t.errors.invalid_name);
      return;
    }
    setSubmitting(true);
    try {
      const h = await placeHold();
      if (!h) {
        setFormError(t.booking.slotTaken);
        setStep(2);
        return;
      }
      const r = await api<{ publicToken: string }>("/api/appointments", {
        body: { holdToken: h.token, name, email, phone: phone || null, whatsappReminder: whatsapp, note: note || null, locale },
      });
      holdRef.current = null;
      setHold(null);
      router.replace(`/${locale}/termin/${r.publicToken}?neu=1`);
    } catch (e) {
      if (e instanceof ApiError && ["hold_expired", "hold_not_found", "slot_unavailable", "hold_consumed"].includes(e.code)) {
        setHold(null);
        if (e.code !== "hold_consumed") {
          setTime(null);
          setStep(2);
        }
      }
      setFormError(err(e));
    } finally {
      setSubmitting(false);
    }
  }

  const dateLabel = date
    ? new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))
    : null;
  const monthLabel = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
  const slotDays = new Set(avail?.days.filter((d) => d.slots.length).map((d) => d.date));
  const closedDays = new Set(avail?.days.filter((d) => d.closed).map((d) => d.date));

  const steps = t.booking.steps;
  const current = isMobile ? step : !variant ? 1 : !time ? 2 : 3;
  const stepState = (n: number) => {
    const done = n === 1 ? !!variant : n === 2 ? !!time : false;
    return current === n ? "is-current" : done ? "is-done" : "";
  };

  return (
    <div className="booking-page">
      <ol className="stepper" aria-label={t.booking.title}>
        {steps.map((label, i) => (
          <li key={label} className={stepState(i + 1)} aria-current={current === i + 1 ? "step" : undefined}>
            <span className="stepper__num">{stepState(i + 1) === "is-done" ? <IconCheck width={20} height={20} /> : i + 1}</span>
            <span>{label}</span>
            {i < steps.length - 1 && <span className="stepper__line" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="booking" data-step={step}>
        {/* 1 — treatment */}
        <section className="card booking__col booking__col--services frame-scroll" aria-labelledby="b-services">
          <h2 id="b-services">{t.booking.chooseTreatment}</h2>
          <div className="stack-sm">
            {services.map((s) => {
              const selected = s.id === serviceId;
              const v = selected && variant ? variant : s.variants[0];
              return (
                <div key={s.id} className="stack-sm">
                  <button type="button" className="service-pick" aria-pressed={selected} onClick={() => chooseService(s.id)}>
                    <span className="service-pick__img">
                      <Img id={s.imageAssetId} alt="" sizes="84px" />
                    </span>
                    <span>
                      <span className="service-pick__name">{s.name[locale]}</span>
                      <span className="small muted" style={{ display: "block" }}>
                        {v.minutes} {t.common.min} · {formatPrice(v.priceCents, locale)}
                      </span>
                    </span>
                    {selected ? (
                      <span className="service-pick__check"><IconCheck /></span>
                    ) : (
                      <span style={{ width: 30 }} />
                    )}
                  </button>
                  {selected && s.variants.length > 1 && (
                    <div className="variant-mini" role="group" aria-label={t.treatment.duration}>
                      {s.variants.map((x) => (
                        <button
                          key={x.id}
                          type="button"
                          className="chip"
                          aria-pressed={x.id === variantId}
                          onClick={() => {
                            setVariantId(x.id);
                            setTime(null);
                          }}
                        >
                          {x.minutes} {t.common.min} · {formatPrice(x.priceCents, locale)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Link className="btn btn--ghost" href={`/${locale}/behandlungen`}>
            {t.booking.allTreatments} <IconArrow />
          </Link>
        </section>

        {/* 2 — date, time, staff */}
        <section className="card booking__col booking__col--time frame-scroll" aria-labelledby="b-time">
          {service && variant && (
            <button type="button" className="service-pick show-mobile-flex" onClick={() => setStep(1)} aria-label={`${t.booking.change}: ${service.name[locale]}`}>
              <span className="service-pick__img"><Img id={service.imageAssetId} alt="" sizes="84px" /></span>
              <span>
                <span className="service-pick__name">{service.name[locale]}</span>
                <span className="small muted" style={{ display: "block" }}>{variant.minutes} {t.common.min}</span>
              </span>
              <span className="price" style={{ fontSize: "1.4rem" }}>{formatPrice(variant.priceCents, locale)}</span>
            </button>
          )}
          <div className="row row--between">
            <h2 id="b-time">{t.booking.chooseDate}</h2>
          </div>
          <div className="cal">
            <div className="cal__head">
              <span className="cal__month" aria-live="polite">{monthLabel}</span>
              <span className="row" style={{ gap: 4 }}>
                <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} disabled={month <= monthOf(today)} aria-label={t.booking.prevMonth}>
                  <IconChevronLeft />
                </button>
                <button type="button" className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= monthOf(lastDay)} aria-label={t.booking.nextMonth}>
                  <IconChevronRight />
                </button>
              </span>
            </div>
            <div className="cal__grid" role="grid" aria-label={monthLabel}>
              {t.booking.weekdays.map((w) => (
                <span key={w} className="cal__dow" role="columnheader">{w}</span>
              ))}
              {Array.from({ length: firstWeekday(month) - 1 }, (_, i) => (
                <span key={`e${i}`} />
              ))}
              {Array.from({ length: daysInMonth(month) }, (_, i) => {
                const d = `${month}-${pad(i + 1)}`;
                const disabled = !service || d < today || d > lastDay || closedDays.has(d) || (!!avail && !slotDays.has(d));
                return (
                  <button
                    key={d}
                    type="button"
                    className={`cal__day${slotDays.has(d) ? " has-slots" : ""}${d === today ? " is-today" : ""}`}
                    aria-pressed={d === date}
                    disabled={disabled}
                    aria-label={new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))}
                    onClick={() => {
                      setDate(d);
                      setTime(null);
                      setHoldMessage(null);
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="stack-sm" aria-live="polite">
            <h3 className="h3">{t.booking.chooseTime}</h3>
            {!service && <p className="muted">{t.booking.chooseTreatment}</p>}
            {loadingAvail && <p className="row muted"><span className="spin" /> {t.booking.loadingSlots}</p>}
            {availError && (
              <p className="notice notice--danger" role="alert">
                {availError} <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReloadKey((k) => k + 1)}>{t.common.retry}</button>
              </p>
            )}
            {!loadingAvail && service && date && day && day.slots.length === 0 && <p className="notice">{t.booking.noSlots}</p>}
            {!loadingAvail && day && day.slots.length > 0 && (
              <div className="slots" role="group" aria-label={t.booking.chooseTime}>
                {day.slots.map((s) => (
                  <button key={s.time} type="button" className="slot" aria-pressed={s.time === time} onClick={() => setTime(s.time)}>
                    {s.time}
                  </button>
                ))}
              </div>
            )}
            {holdMessage && <p className="notice notice--warn" role="alert">{holdMessage}</p>}
          </div>

          <div className="field">
            <label htmlFor="b-staff">{t.booking.staff}</label>
            <select id="b-staff" className="select" value={staffId} onChange={(e) => { setStaffId(e.target.value); setTime(null); }}>
              <option value="">{t.booking.noPreference}</option>
              {avail?.staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* 3 — summary & contact */}
        <section className="card booking__col booking__col--contact frame-scroll" aria-labelledby="b-choice">
          <h2 id="b-choice">{t.booking.yourChoice}</h2>
          {service && variant ? (
            <div className="service-pick" style={{ cursor: "default" }}>
              <span className="service-pick__img"><Img id={service.imageAssetId} alt="" sizes="84px" /></span>
              <span>
                <span className="service-pick__name">{service.name[locale]}</span>
                <span className="small muted" style={{ display: "block" }}>{variant.minutes} {t.common.min}</span>
              </span>
              <span className="price" style={{ fontSize: "1.45rem" }}>{formatPrice(variant.priceCents, locale)}</span>
            </div>
          ) : (
            <p className="muted">{t.booking.chooseTreatment}</p>
          )}
          <div className="booking-summary">
            <p className="summary-line" style={{ margin: 0 }}><IconCalendar /> {dateLabel ?? "—"}</p>
            <p className="summary-line" style={{ margin: 0 }}><IconClock /> {time ? `${time} ${t.booking.uhr}` : "—"} <span className="small muted">({timezone})</span></p>
            {hold && !holdExpired && <p className="small muted" style={{ margin: 0 }}>{t.booking.holdActive(holdLeftMin)}</p>}
            {holdExpired && <p className="small notice notice--warn" style={{ margin: 0 }}>{t.booking.holdExpired}</p>}
          </div>

          <form className="stack booking-form" onSubmit={submit} noValidate>
            <h2 className="h3">{t.booking.contact}</h2>
            <div className="booking-form__pair">
            <div className="field">
              <label htmlFor="b-name">{t.booking.name} *</label>
              <div className="input-icon"><IconUser /><input id="b-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={fieldErrors.name || undefined} required maxLength={120} /></div>
            </div>
            <div className="field">
              <label htmlFor="b-email">{t.booking.email} *</label>
              <div className="input-icon"><IconMail /><input id="b-email" className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={fieldErrors.email || undefined} required maxLength={200} /></div>
            </div>
            </div>
            <div className="booking-form__pair">
            <div className="field">
              <label htmlFor="b-phone">{t.booking.phone} ({t.common.optional})</label>
              <div className="input-icon"><IconPhone /><input id="b-phone" className="input" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={fieldErrors.phone || undefined} aria-describedby="b-phone-hint" maxLength={30} /></div>
              <span id="b-phone-hint" className="hint booking-form__hint">{t.booking.phoneHint}</span>
            </div>
            <div className="field">
              <label htmlFor="b-note">{t.booking.note} ({t.common.optional})</label>
              <input id="b-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t.booking.notePlaceholder} />
            </div>
            </div>
            {whatsappAvailable ? (
              <label className="check">
                <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
                <span>
                  <strong className="row" style={{ gap: 8 }}><IconWhatsapp width={20} height={20} /> {t.booking.whatsapp} ({t.common.optional})</strong>
                  <span className="small muted">{t.booking.whatsappConsent}</span>
                </span>
              </label>
            ) : (
              <p className="small muted row booking-note-wa" style={{ gap: 8, margin: 0 }}><IconInfo width={18} height={18} /> {t.booking.whatsappUnavailable}</p>
            )}
            {formError && <p className="notice notice--danger" role="alert">{formError}</p>}
            <button className="btn btn--lg btn--block" type="submit" disabled={submitting}>
              {submitting && <span className="spin" />} {t.booking.submit} <IconArrow />
            </button>
            <p className="small muted" style={{ textAlign: "center", margin: 0 }}>{t.booking.confirmHint} {t.booking.privacy}</p>
          </form>
        </section>
      </div>

      {/* mobile sticky bar: step navigation, never submits before contact */}
      {step < 3 && (
        <div className="booking-bar">
          <div>
            <span className="small muted">{t.booking.totalPrice}</span>
            <div className="price">{variant ? formatPrice(variant.priceCents, locale) : "—"}</div>
          </div>
          {step === 1 ? (
            <button type="button" className="btn btn--block" disabled={!variant} onClick={() => setStep(2)}>
              {t.booking.toTime} <IconArrow />
            </button>
          ) : (
            <button type="button" className="btn btn--block" disabled={!time} onClick={() => { setStep(3); window.scrollTo({ top: 0 }); }}>
              {t.booking.next} <IconArrow />
            </button>
          )}
          <span className="small muted" style={{ gridColumn: "1 / -1" }}>{step === 2 ? t.booking.nextHint : ""}</span>
        </div>
      )}
      {step === 3 && (
        <div className="show-mobile-block" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn--outline btn--block" onClick={() => setStep(2)}>
            {t.common.back}
          </button>
        </div>
      )}
      <div className="content-pad-bar" aria-hidden />
    </div>
  );
}
