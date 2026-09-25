DROP INDEX "newsletter_direct_sends_issue_email_idx";--> statement-breakpoint
ALTER TABLE "newsletter_direct_sends" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_direct_sends_issue_email_version_idx" ON "newsletter_direct_sends" USING btree ("issue_id","email","version");