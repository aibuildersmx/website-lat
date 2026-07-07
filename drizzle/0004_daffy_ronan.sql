ALTER TABLE "contacts" ADD COLUMN "attribution_source" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "attribution_medium" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "attribution_campaign" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "attribution_content" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "attribution_term" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "attribution_referrer" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "attribution_landing_page" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "attribution_captured_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "contacts_attribution_source_idx" ON "contacts" USING btree ("attribution_source");--> statement-breakpoint
CREATE INDEX "contacts_attribution_medium_idx" ON "contacts" USING btree ("attribution_medium");--> statement-breakpoint
CREATE INDEX "contacts_attribution_campaign_idx" ON "contacts" USING btree ("attribution_campaign");