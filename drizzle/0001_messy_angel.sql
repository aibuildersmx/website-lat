ALTER TABLE "contacts" ADD COLUMN "newsletter_subscribed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "newsletter_unsubscribed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "contacts"
SET "newsletter_subscribed_at" = COALESCE("first_seen_at", "created_at")
WHERE "newsletter_subscribed" = true
  AND "newsletter_subscribed_at" IS NULL;--> statement-breakpoint
UPDATE "contacts"
SET "newsletter_unsubscribed_at" = COALESCE("updated_at", "created_at")
WHERE "newsletter_subscribed" = false
  AND "newsletter_unsubscribed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "contacts_newsletter_subscribed_at_idx" ON "contacts" USING btree ("newsletter_subscribed_at");
