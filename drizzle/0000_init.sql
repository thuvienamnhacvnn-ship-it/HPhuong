CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"public_token_hash" text NOT NULL,
	"public_token_sealed" text,
	"customer_id" text NOT NULL,
	"kind" text DEFAULT 'slot' NOT NULL,
	"status" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"timezone" text NOT NULL,
	"pending_expires_at" timestamp with time zone,
	"preferred_staff_id" text,
	"customer_note" text,
	"request_preferences" jsonb,
	"whatsapp_reminder" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_public_token_hash_unique" UNIQUE("public_token_hash")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt" jsonb NOT NULL,
	"is_concept" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_id" text,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_holds" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"plan" jsonb NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_holds_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"brand" text NOT NULL,
	"timezone" text DEFAULT 'Europe/Berlin' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"map_url" text,
	"booking_mode" text DEFAULT 'manual_confirmation' NOT NULL,
	"appointment_payment" text DEFAULT 'pay_at_studio' NOT NULL,
	"slot_step_minutes" integer DEFAULT 30 NOT NULL,
	"hold_ttl_minutes" integer DEFAULT 10 NOT NULL,
	"pending_ttl_hours" integer DEFAULT 24 NOT NULL,
	"min_lead_minutes" integer DEFAULT 120 NOT NULL,
	"booking_horizon_days" integer DEFAULT 60 NOT NULL,
	"reminder_hours_before" integer DEFAULT 24 NOT NULL,
	"combo_buffer_minutes" integer DEFAULT 10 NOT NULL,
	"voucher_denominations_cents" jsonb DEFAULT '[5000,10000,15000]'::jsonb NOT NULL,
	"voucher_message_max_length" integer DEFAULT 300 NOT NULL,
	"payment_mode" text DEFAULT 'sandbox' NOT NULL,
	"staff_notify_email" text,
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"public_launch_enabled" boolean DEFAULT false NOT NULL,
	"team_note" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"channel" text NOT NULL,
	"granted" boolean NOT NULL,
	"source" text NOT NULL,
	"text_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"locale" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"title" jsonb NOT NULL,
	"body" jsonb NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"locale" text DEFAULT 'de' NOT NULL,
	"marketing_email" boolean DEFAULT false NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magic_links" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"dedupe_key" text NOT NULL,
	"channel" text NOT NULL,
	"template" text NOT NULL,
	"recipient" text NOT NULL,
	"locale" text DEFAULT 'de' NOT NULL,
	"payload" jsonb NOT NULL,
	"appointment_id" text,
	"run_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_jobs_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"price_cents" integer NOT NULL,
	"treatment_minutes" integer NOT NULL,
	"components" jsonb NOT NULL,
	"booking_mode" text NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"weekdays" jsonb,
	"time_window" jsonb,
	"channels" jsonb DEFAULT '["web"]'::jsonb NOT NULL,
	"combinable" boolean DEFAULT false NOT NULL,
	"image_asset_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"channel" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"payment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_provider_event_id_pk" PRIMARY KEY("provider","event_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_session_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_session_id_unique" UNIQUE("provider_session_id")
);
--> statement-breakpoint
CREATE TABLE "resource_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"hold_id" text,
	"appointment_id" text,
	"blocks_until" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"type" text,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_variants" (
	"service_id" text NOT NULL,
	"id" text NOT NULL,
	"minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "service_variants_service_id_id_pk" PRIMARY KEY("service_id","id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"name" jsonb NOT NULL,
	"teaser" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"steps" jsonb NOT NULL,
	"preparation" jsonb NOT NULL,
	"content_approved" boolean DEFAULT false NOT NULL,
	"image_asset_id" text,
	"video_url" text,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 15 NOT NULL,
	"room_types" jsonb NOT NULL,
	"equipment_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bookable" boolean DEFAULT true NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"subject_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_skills" (
	"staff_id" text NOT NULL,
	"service_id" text NOT NULL,
	CONSTRAINT "staff_skills_staff_id_service_id_pk" PRIMARY KEY("staff_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "time_off" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_id" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"staff_id" text,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voucher_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"voucher_id" text NOT NULL,
	"type" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"balance_after_cents" integer NOT NULL,
	"actor" text,
	"note" text,
	"appointment_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"public_token_hash" text NOT NULL,
	"public_token_sealed" text,
	"idempotency_key" text NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"recipient_name" text,
	"message" text,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"locale" text DEFAULT 'de' NOT NULL,
	"status" text NOT NULL,
	"payment_method" text NOT NULL,
	"customer_id" text,
	"is_test" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voucher_orders_public_token_hash_unique" UNIQUE("public_token_hash"),
	CONSTRAINT "voucher_orders_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text,
	"code_hash" text NOT NULL,
	"code_last4" text NOT NULL,
	"initial_cents" integer NOT NULL,
	"balance_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"is_test" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "vouchers_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_image_asset_id_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_voucher_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."voucher_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_hold_id_booking_holds_id_fk" FOREIGN KEY ("hold_id") REFERENCES "public"."booking_holds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_variants" ADD CONSTRAINT "service_variants_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_image_asset_id_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_skills" ADD CONSTRAINT "staff_skills_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_skills" ADD CONSTRAINT "staff_skills_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_ledger" ADD CONSTRAINT "voucher_ledger_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_orders" ADD CONSTRAINT "voucher_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_order_id_voucher_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."voucher_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_start_idx" ON "appointments" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_uq" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "jobs_due_idx" ON "notification_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "alloc_resource_time_idx" ON "resource_allocations" USING btree ("resource_id","starts_at","ends_at");