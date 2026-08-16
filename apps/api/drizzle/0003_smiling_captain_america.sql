CREATE TABLE "tracked_repos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"provider_repo_id" text NOT NULL,
	"full_name" text NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"html_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracked_repos_user_id_provider_provider_repo_id_unique" UNIQUE("user_id","provider","provider_repo_id")
);
--> statement-breakpoint
ALTER TABLE "user_identities" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "tracked_repos" ADD CONSTRAINT "tracked_repos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;