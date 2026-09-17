/**
 * Data model — HPHUONG Cosmetic & Spa.
 *
 * Money is always integer cents, durations integer minutes, instants are
 * timestamptz (UTC) and the business zone lives in business_settings.
 * Rows created by the seed carry `is_demo = true` so they never mix silently
 * with production data.
 */
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const created = () => ts("created_at").notNull().defaultNow();

export type I18nText = { de: string; en: string };

export const businessSettings = pgTable("business_settings", {
  id: integer("id").primaryKey().default(1),
  brand: text("brand").notNull(),
  timezone: text("timezone").notNull().default("Europe/Berlin"),
  currency: text("currency").notNull().default("EUR"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>().notNull().default({}),
  mapUrl: text("map_url"),
  bookingMode: text("booking_mode").notNull().default("manual_confirmation"),
  appointmentPayment: text("appointment_payment").notNull().default("pay_at_studio"),
  slotStepMinutes: integer("slot_step_minutes").notNull().default(30),
  holdTtlMinutes: integer("hold_ttl_minutes").notNull().default(10),
  pendingTtlHours: integer("pending_ttl_hours").notNull().default(24),
  minLeadMinutes: integer("min_lead_minutes").notNull().default(120),
  bookingHorizonDays: integer("booking_horizon_days").notNull().default(60),
  reminderHoursBefore: integer("reminder_hours_before").notNull().default(24),
  comboBufferMinutes: integer("combo_buffer_minutes").notNull().default(10),
  voucherDenominationsCents: jsonb("voucher_denominations_cents").$type<number[]>().notNull().default([5000, 10000, 15000]),
  voucherMessageMaxLength: integer("voucher_message_max_length").notNull().default(300),
  paymentMode: text("payment_mode").notNull().default("sandbox"),
  staffNotifyEmail: text("staff_notify_email"),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  publicLaunchEnabled: boolean("public_launch_enabled").notNull().default(false),
  teamNote: text("team_note"),
  isDemo: boolean("is_demo").notNull().default(false),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const assets = pgTable("assets", {
  id: text("id").primaryKey(), // e.g. "service-facial"
  source: text("source").notNull(), // assets/images/service-facial.png
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  alt: jsonb("alt").$type<I18nText>().notNull(),
  isConcept: boolean("is_concept").notNull().default(true),
});

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  category: text("category").notNull(), // gesicht | massage | head-spa | pflege
  name: jsonb("name").$type<I18nText>().notNull(),
  teaser: jsonb("teaser").$type<I18nText>().notNull(),
  description: jsonb("description").$type<I18nText>().notNull(),
  steps: jsonb("steps").$type<{ de: string[]; en: string[] }>().notNull(),
  preparation: jsonb("preparation").$type<{ de: string[]; en: string[] }>().notNull(),
  contentApproved: boolean("content_approved").notNull().default(false),
  imageAssetId: text("image_asset_id").references(() => assets.id),
  videoUrl: text("video_url"),
  bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
  bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(15),
  roomTypes: jsonb("room_types").$type<string[]>().notNull(),
  equipmentTypes: jsonb("equipment_types").$type<string[]>().notNull().default([]),
  bookable: boolean("bookable").notNull().default(true),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
});

export const serviceVariants = pgTable(
  "service_variants",
  {
    serviceId: text("service_id").notNull().references(() => services.id),
    id: text("id").notNull(), // "60"
    minutes: integer("minutes").notNull(),
    priceCents: integer("price_cents").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.serviceId, t.id] })],
);

export const staff = pgTable("staff", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  active: boolean("active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
});

export const staffSkills = pgTable(
  "staff_skills",
  {
    staffId: text("staff_id").notNull().references(() => staff.id),
    serviceId: text("service_id").notNull().references(() => services.id),
  },
  (t) => [primaryKey({ columns: [t.staffId, t.serviceId] })],
);

/** Rooms and equipment share one table so allocation/locking is uniform. */
export const resources = pgTable("resources", {
  id: text("id").primaryKey(), // staff resources use "staff:<id>"
  kind: text("kind").notNull(), // staff | room | equipment
  type: text("type"), // room: cosmetic | body ; equipment: headspa-basin ...
  name: jsonb("name").$type<I18nText>().notNull(),
  description: jsonb("description").$type<I18nText>(),
  active: boolean("active").notNull().default(true),
});

/** Weekly working rules. resourceId null = business opening hours. */
export const availabilityRules = pgTable("availability_rules", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").references(() => resources.id),
  weekday: integer("weekday").notNull(), // 1 = Monday … 7 = Sunday (ISO)
  startTime: text("start_time").notNull(), // "09:00" local
  endTime: text("end_time").notNull(),
});

/** Closures, holidays, sick days, blocked rooms. resourceId null = whole studio. */
export const timeOff = pgTable("time_off", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").references(() => resources.id),
  startsAt: ts("starts_at").notNull(),
  endsAt: ts("ends_at").notNull(),
  reason: text("reason"),
  createdBy: text("created_by"),
  createdAt: created(),
});

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    locale: text("locale").notNull().default("de"),
    marketingEmail: boolean("marketing_email").notNull().default(false),
    whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: created(),
  },
  (t) => [uniqueIndex("customers_email_uq").on(t.email)],
);

export const bookingHolds = pgTable("booking_holds", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  plan: jsonb("plan").$type<unknown>().notNull(),
  startsAt: ts("starts_at").notNull(),
  expiresAt: ts("expires_at").notNull(),
  consumedAt: ts("consumed_at"),
  createdAt: created(),
});

export const appointments = pgTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    publicTokenHash: text("public_token_hash").notNull().unique(),
    // Encrypted copy so later e-mails (confirmation, reminder) can include the guest link.
    publicTokenSealed: text("public_token_sealed"),
    customerId: text("customer_id").notNull().references(() => customers.id),
    kind: text("kind").notNull().default("slot"), // slot | combo_request
    status: text("status").notNull(), // pending | confirmed | rejected | cancelled | expired | requested
    // Snapshot at booking time — later price edits never change this row.
    snapshot: jsonb("snapshot").$type<AppointmentSnapshot>().notNull(),
    startsAt: ts("starts_at"),
    endsAt: ts("ends_at"),
    timezone: text("timezone").notNull(),
    pendingExpiresAt: ts("pending_expires_at"),
    preferredStaffId: text("preferred_staff_id"),
    customerNote: text("customer_note"),
    requestPreferences: jsonb("request_preferences").$type<Record<string, unknown> | null>(),
    whatsappReminder: boolean("whatsapp_reminder").notNull().default(false),
    source: text("source").notNull().default("web"), // web | admin
    decidedBy: text("decided_by"),
    decidedAt: ts("decided_at"),
    cancelledAt: ts("cancelled_at"),
    cancelReason: text("cancel_reason"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: created(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("appointments_start_idx").on(t.startsAt), index("appointments_status_idx").on(t.status)],
);

export type AppointmentSnapshot = {
  segments: {
    serviceId: string;
    variantId: string;
    name: I18nText;
    minutes: number;
    priceCents: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    startsAt?: string;
    endsAt?: string;
    staffId?: string;
    roomId?: string;
    equipmentIds?: string[];
  }[];
  offerId?: string;
  totalCents: number;
  totalMinutes: number;
  currency: string;
  policy: { bookingMode: string; payment: string; pendingTtlHours: number };
};

/**
 * One row per resource per booked interval (buffers included).
 * A row blocks its resource while released_at is null and blocks_until > now().
 */
export const resourceAllocations = pgTable(
  "resource_allocations",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id").notNull().references(() => resources.id),
    startsAt: ts("starts_at").notNull(), // buffer-inclusive
    endsAt: ts("ends_at").notNull(),
    holdId: text("hold_id").references(() => bookingHolds.id),
    appointmentId: text("appointment_id").references(() => appointments.id),
    blocksUntil: ts("blocks_until").notNull(),
    releasedAt: ts("released_at"),
    createdAt: created(),
  },
  (t) => [index("alloc_resource_time_idx").on(t.resourceId, t.startsAt, t.endsAt)],
);

export const offers = pgTable("offers", {
  id: text("id").primaryKey(),
  name: jsonb("name").$type<I18nText>().notNull(),
  description: jsonb("description").$type<I18nText>().notNull(),
  priceCents: integer("price_cents").notNull(),
  treatmentMinutes: integer("treatment_minutes").notNull(),
  components: jsonb("components").$type<{ serviceId: string; variantId: string }[]>().notNull(),
  bookingMode: text("booking_mode").notNull(), // staff_scheduling_request | instant
  validFrom: ts("valid_from"),
  validUntil: ts("valid_until"),
  weekdays: jsonb("weekdays").$type<number[] | null>(),
  timeWindow: jsonb("time_window").$type<[string, string] | null>(),
  channels: jsonb("channels").$type<string[]>().notNull().default(["web"]),
  combinable: boolean("combinable").notNull().default(false),
  imageAssetId: text("image_asset_id").references(() => assets.id),
  active: boolean("active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
});

export const voucherOrders = pgTable("voucher_orders", {
  id: text("id").primaryKey(),
  publicTokenHash: text("public_token_hash").notNull().unique(),
  publicTokenSealed: text("public_token_sealed"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  recipientName: text("recipient_name"),
  message: text("message"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull(),
  locale: text("locale").notNull().default("de"),
  status: text("status").notNull(), // pending | paid | failed | cancelled | refunded
  paymentMethod: text("payment_method").notNull(), // card | paypal
  customerId: text("customer_id").references(() => customers.id),
  isTest: boolean("is_test").notNull().default(true),
  createdAt: created(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => voucherOrders.id),
  provider: text("provider").notNull(), // sandbox | stripe | paypal
  providerSessionId: text("provider_session_id").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(), // pending | paid | failed | cancelled | refunded
  createdAt: created(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const paymentEvents = pgTable("payment_events", {
  provider: text("provider").notNull(),
  eventId: text("event_id").notNull(),
  type: text("type").notNull(),
  paymentId: text("payment_id"),
  receivedAt: created(),
}, (t) => [primaryKey({ columns: [t.provider, t.eventId] })]);

export const vouchers = pgTable("vouchers", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => voucherOrders.id).unique(), // one voucher per order
  codeHash: text("code_hash").notNull().unique(),
  codeLast4: text("code_last4").notNull(),
  initialCents: integer("initial_cents").notNull(),
  balanceCents: integer("balance_cents").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(), // active | void | refunded | used
  isTest: boolean("is_test").notNull().default(true),
  issuedAt: created(),
});

export const voucherLedger = pgTable("voucher_ledger", {
  id: text("id").primaryKey(),
  voucherId: text("voucher_id").notNull().references(() => vouchers.id),
  type: text("type").notNull(), // issue | redeem | refund | void
  amountCents: integer("amount_cents").notNull(), // signed: issue +, redeem -
  balanceAfterCents: integer("balance_after_cents").notNull(),
  actor: text("actor"),
  note: text("note"),
  appointmentId: text("appointment_id"),
  createdAt: created(),
});

export const consents = pgTable("consents", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  channel: text("channel").notNull(), // whatsapp | marketing_email
  granted: boolean("granted").notNull(),
  source: text("source").notNull(), // booking_form | account
  textVersion: text("text_version").notNull(),
  createdAt: created(),
});

export const notificationJobs = pgTable(
  "notification_jobs",
  {
    id: text("id").primaryKey(),
    dedupeKey: text("dedupe_key").notNull().unique(), // entity:event:channel
    channel: text("channel").notNull(), // email | whatsapp
    template: text("template").notNull(),
    recipient: text("recipient").notNull(),
    locale: text("locale").notNull().default("de"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    appointmentId: text("appointment_id"),
    runAt: ts("run_at").notNull(),
    status: text("status").notNull(), // queued | sent | dev_outbox | failed | cancelled | skipped
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    createdAt: created(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("jobs_due_idx").on(t.status, t.runAt)],
);

/** Rendered messages the dev adapter would have sent. Never marked "delivered". */
export const outbox = pgTable("outbox", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  channel: text("channel").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  createdAt: created(),
});

export const contactTickets = pgTable("contact_tickets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  locale: text("locale").notNull(),
  status: text("status").notNull().default("open"), // open | answered | spam
  createdAt: created(),
});

export const contentPages = pgTable("content_pages", {
  id: text("id").primaryKey(), // impressum | datenschutz | agb | faq
  title: jsonb("title").$type<I18nText>().notNull(),
  body: jsonb("body").$type<I18nText>().notNull(),
  approved: boolean("approved").notNull().default(false),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // owner | manager | therapist
  staffId: text("staff_id").references(() => staff.id),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});

/** Sessions for both customers (magic link) and staff users. */
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  kind: text("kind").notNull(), // customer | staff
  subjectId: text("subject_id").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: created(),
});

export const magicLinks = pgTable("magic_links", {
  tokenHash: text("token_hash").primaryKey(),
  email: text("email").notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: created(),
});

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: created(),
});
