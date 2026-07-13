CREATE TABLE "mcp_api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mcp_api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "mcp_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"token_id" uuid,
	"request_id" text NOT NULL,
	"operation" text NOT NULL,
	"newsletter_id" uuid,
	"outcome" text NOT NULL,
	"error_code" text,
	"ip_hash" text,
	"user_agent" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter_issues" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_api_tokens" ADD CONSTRAINT "mcp_api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_audit_log" ADD CONSTRAINT "mcp_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_audit_log" ADD CONSTRAINT "mcp_audit_log_token_id_mcp_api_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."mcp_api_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_audit_log" ADD CONSTRAINT "mcp_audit_log_newsletter_id_newsletter_issues_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletter_issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_api_tokens_user_id_idx" ON "mcp_api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcp_api_tokens_active_idx" ON "mcp_api_tokens" USING btree ("expires_at","revoked_at");--> statement-breakpoint
CREATE INDEX "mcp_audit_log_token_created_idx" ON "mcp_audit_log" USING btree ("token_id","created_at");--> statement-breakpoint
CREATE INDEX "mcp_audit_log_user_created_idx" ON "mcp_audit_log" USING btree ("user_id","created_at");