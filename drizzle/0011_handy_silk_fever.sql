CREATE TABLE "newsletter_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sha256" text NOT NULL,
	"token_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_images_sha256_unique" UNIQUE("sha256")
);
--> statement-breakpoint
ALTER TABLE "newsletter_images" ADD CONSTRAINT "newsletter_images_token_id_mcp_api_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."mcp_api_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_images" ADD CONSTRAINT "newsletter_images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;