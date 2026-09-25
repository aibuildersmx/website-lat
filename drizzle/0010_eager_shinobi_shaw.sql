CREATE TABLE "newsletter_direct_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"email" text NOT NULL,
	"contact_id" uuid,
	"token_id" uuid,
	"resend_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter_direct_sends" ADD CONSTRAINT "newsletter_direct_sends_issue_id_newsletter_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."newsletter_issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_direct_sends" ADD CONSTRAINT "newsletter_direct_sends_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_direct_sends" ADD CONSTRAINT "newsletter_direct_sends_token_id_mcp_api_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."mcp_api_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_direct_sends_issue_email_idx" ON "newsletter_direct_sends" USING btree ("issue_id","email");