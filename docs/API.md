# API

All endpoints return JSON. Errors: `{ "error": "<code>" }` with HTTP status (400 validation, 401/403 auth,
404, 409 business conflict, 429 rate limit). State-changing calls must come from the site's own origin
(`src/proxy.ts`), except payment webhooks (HMAC signature).

## Public

| Method & path | Body / query | Result |
|---|---|---|
| `GET /api/health` | – | DB kind, demo flag, which integrations are live/sandbox/mocked |
| `GET /api/catalog` | `category, q, maxPriceCents, maxMinutes, bookable=1` | services with variants, current offers |
| `POST /api/quote` | `{serviceId, variantId}` or `{offerId}` | server-side price & duration |
| `GET /api/availability` | `service, variant` or `offer`, `from=YYYY-MM-DD`, `days≤42`, `staff`; header `x-hold-token` (own hold is not counted as busy) | `days[{date, slots[{time, startsAt}], closed}]`, qualified `staff` |
| `POST /api/holds` | `{serviceId, variantId, date, time, staffId?, previousHoldToken?}` | `{holdToken, expiresAt, startsAt, endsAt, totalCents}` — 409 `slot_unavailable` |
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
| `POST /api/assistant/choose` | `{goal, maxMinutes?, budgetCents?}` | rule-based suggestions `{within[], aboveBudget[]}` |
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
| `PATCH /api/admin/services/[id]` | manager (variants/prices: owner) | visibility, buffers, texts, skills, video URL |
| `POST /api/admin/vouchers/lookup` | therapist | `{code}` (code only in body, never URL) |
| `POST /api/admin/vouchers/redeem` | therapist | `{code, amountCents, note?}` |
| `POST /api/admin/orders/[id]/refund` | owner | `{allowPartial?, note?}` |
| `POST /api/admin/vouchers/[id]/void` | owner | `{note}` |
| `PATCH /api/admin/settings` | owner (manager: team note only) | contact data, social links, booking policy, WhatsApp switch |
| `POST /api/admin/jobs/[id]` | manager | retry a failed notification (same job, no duplicate) |
| `PATCH /api/admin/tickets/[id]` | manager | `{status}` |
