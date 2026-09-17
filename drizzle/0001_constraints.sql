-- Custom SQL migration file, put your code below! ---- Hand-written guards the ORM schema cannot express.
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_balance_nonnegative" CHECK ("balance_cents" >= 0 AND "balance_cents" <= "initial_cents");
--> statement-breakpoint
ALTER TABLE "resource_allocations" ADD CONSTRAINT "alloc_interval_valid" CHECK ("ends_at" > "starts_at");
--> statement-breakpoint
ALTER TABLE "service_variants" ADD CONSTRAINT "variant_positive" CHECK ("minutes" > 0 AND "price_cents" >= 0);
--> statement-breakpoint
ALTER TABLE "voucher_orders" ADD CONSTRAINT "order_amount_positive" CHECK ("amount_cents" > 0);
--> statement-breakpoint
CREATE INDEX "alloc_active_idx" ON "resource_allocations" ("resource_id", "starts_at") WHERE "released_at" IS NULL;
