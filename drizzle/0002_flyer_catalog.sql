ALTER TABLE "service_variants" ALTER COLUMN "minutes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "mobile_phone" text;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "hours_notes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "service_variants" ADD COLUMN "label" jsonb;--> statement-breakpoint
ALTER TABLE "service_variants" ADD COLUMN "price_from" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "service_variants" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "is_addon" boolean DEFAULT false NOT NULL;