# API

All endpoints return JSON. Errors: `{ "error": "<code>" }` with HTTP status (400 validation, 401/403 auth,
404, 409 business conflict, 429 rate limit). State-changing calls must come from the site's own origin
(`src/proxy.ts`), except payment webhooks (HMAC signature).

## Public

| Method & path | Body / query | Result |
|---|---|---|
| `GET /api/health` | – | DB kind, demo flag, which integrations are live/sandbox/mocked |
| `GET /api/catalog` | `category` (one id or several, comma-separated: `manikuere,pedikuere`), `q, maxPriceCents, maxMinutes, bookable=1` | `services[{id, category, name, teaser, imageAssetId, bookable, isAddon, variants[{id, label\|null, minutes\|null, priceCents, priceFrom, bookable}]}]`, current `offers` |
| `POST /api/quote` | `{serviceId, variantId}` or `{offerId}` | server-side price & duration: `items[{…, minutes\|null, priceFrom}]`, `totalCents`, `priceFrom`, `treatmentMinutes\|null`, `bookingMode` (`not_bookable` for rows without a duration) |
| `GET /api/availability` | `service, variant` or `offer`, `from=YYYY-MM-DD`, `days≤42`, `staff`; header `x-hold-token` (own hold is not counted as busy) | `days[{date, slots[{time, startsAt}], closed}]`, qualified `staff` |
| `POST /api/holds` | `{serviceId, variantId, date, time, staffId?, previousHoldToken?}` | `{holdToken, expiresAt, startsAt, endsAt, totalCents}` — 409 `slot_unavailable`, 409 `service_not_bookable` (row without a duration, add-on, or service switched off for online booking; same code from `/api/availability`) |
| `DELETE /api/holds` | `{holdToken}` | releases the hold |
| `POST /api/appointments` | `{holdToken, name, email, phone?, whatsappReminder?, note?, locale}` | `{status: "pending"|"confirmed", publicToken}` |
| `PATCH /api/appointments/[token]` | `{action: "cancel"}` | guest cancel via scoped link (valid until 30 days after the appointment) |
| `POST /api/combo-requests` | `{offerId, preferredDates, preferredTime, name, email, …}` | package request (`status: requested`), no fake slot |
| `POST /api/voucher-orders` | `{amountCents ∈ denominations, buyerName, buyerEmail, recipientName?, message≤300, paymentMethod, idempotencyKey, locale}` | `{redirectUrl, orderToken}` (same key → same order) |
| `GET /api/voucher-orders/[token]` | – | `{status, amountCents, isTest, voucherIssued}` — never the code |
| `POST /api/payments/sandbox` | `{sessionId, outcome}` | sandbox checkout buttons; emits a signed event through the webhook handler |
| `POST /api/webhooks/payments/[provider]` | raw event, header `x-hphuong-signature: hex(HMAC-SHA256(body))` | idempotent by event id |
| `GET /api/assistant` | – | `{enabled}` |
| `POST /api/assistant` | `{locale, turns[{role, text}]}` | `{mode: "ai"|"unavailable", text, cards[], handoff}` |
| `POST /api/assistant/choose` | `{goal: entspannung\|gesicht\|koerper\|fuesse\|egal, maxMinutes?, budgetCents?}` | rule-based suggestions `{within[], aboveBudget[]}` (cards carry `priceFrom`); only rows that can be booked online |
| `POST /api/contact` | `{name, email, message≤500, locale, website(honeypot), startedAt}` | stores ticket, sends copy |
| `POST /api/auth/magic-link` | `{email, locale}` | always `{ok:true}` (no enumeration) |
| `GET /[locale]/login/verify?token=` | – | sets session cookie, redirects to `/konto` |
| `POST /api/auth/logout` | – | |
| `PATCH /api/account/preferences` | `{marketingEmail?, whatsappOptIn?}` | consent log entry per change |

## Staff (cookie `hp_staff`, role in brackets)

| Method & path | Role | Body |
|---|---|---|
| `POST /api/admin/login` / `logout` | – | `{email, password}` |
| `PATCH /api/admin/appointments/[id]` | manager | `{action: approve|reject|cancel}` or `{action: reschedule|schedule, date, time, staffId?}` |
| `POST /api/admin/appointments/manual` | manager | service, variant, date, time, staff?, customer → confirmed |
| `GET /api/admin/availability` | manager | same as public availability |
| `GET /api/admin/candidates?id=&date=` | manager | chain start times for a package request |
| `POST /DELETE /api/admin/time-off` | manager | block resource or whole studio; returns overlapping appointment ids |
| `PATCH /api/admin/services/[id]` | manager (variants/prices: owner) | visibility, buffers, texts, skills, video URL; `variants[{id, minutes\|null, priceCents, priceFrom?, active}]` (`minutes: null` = no published duration) |
| `POST /api/admin/vouchers/lookup` | therapist | `{code}` (code only in body, never URL) |
| `POST /api/admin/vouchers/redeem` | therapist | `{code, amountCents, note?}` |
| `POST /api/admin/orders/[id]/refund` | owner | `{allowPartial?, note?}` |
| `POST /api/admin/vouchers/[id]/void` | owner | `{note}` |
| `PATCH /api/admin/settings` | owner (manager: team note only) | contact data (`address, phone, mobilePhone, email, mapUrl`), social links, booking policy, WhatsApp switch |
| `POST /api/admin/jobs/[id]` | manager | retry a failed notification (same job, no duplicate) |
| `PATCH /api/admin/tickets/[id]` | manager | `{status}` |

## Catalog model (since the flyer update, 2026-10-06)

- **Groups**: nine fixed ids in `src/lib/categories.ts` (`gesicht-pflege`, `spezial-koerper`, `entspannung-sugaring`,
  `massage-wellness`, `manikuere`, `pedikuere`, `nageldesign`, `wimpernverlaengerung`, `augenkosmetik`) with name,
  subtitle, intro and notes in DE/EN. `services.category` holds one of them.
- **Price rows** = `service_variants`. New columns (migration `drizzle/0002_flyer_catalog.sql`):
  `label` (row name when a treatment has several rows, else null), `price_from` ("ab" price), `sort_order`;
  `minutes` is now **nullable**: null = the studio publishes no duration.
- **Bookable online** = `services.bookable` AND not `services.is_addon` AND `minutes` is not null
  (`bookableVariants()` / `resolveBookableVariant()` in `src/lib/catalog.ts`). Everything else is shown with its price
  and "Termin telefonisch oder per WhatsApp".
- **Prices** are formatted with `formatServicePrice(cents, locale, priceFrom)` → `ab 25,00 €` / `from €25.00`.
  Appointment snapshots keep `segments[].priceFrom`, so e-mails and the appointment page say "ab" too.
- **Studio**: `business_settings.mobile_phone` (mobile / WhatsApp) and `hours_notes`
  (`{"6": {"de": "nach Vereinbarung", "en": "by appointment"}}` — a weekday with a note and no opening rule gets no slots).
- **Source of the data**: `src/lib/flyer-data.ts` (67 rows). `npm run seed` (new database) and `npm run catalog:sync`
  (existing database, idempotent) both write it through `applyFlyer()` in `src/lib/seed-data.ts`.
