CREATE TABLE "repo_commits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repo_id" uuid NOT NULL,
	"sha" text NOT NULL,
	"message" text NOT NULL,
	"author_login" text,
	"author_avatar_url" text,
	"committed_at" timestamp with time zone NOT NULL,
	"html_url" text NOT NULL,
	CONSTRAINT "repo_commits_repo_id_sha_unique" UNIQUE("repo_id","sha")
);
--> statement-breakpoint
ALTER TABLE "tracked_repos" ADD COLUMN "commits_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "repo_commits" ADD CONSTRAINT "repo_commits_repo_id_tracked_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."tracked_repos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repo_commits_repo_id_committed_at_idx" ON "repo_commits" USING btree ("repo_id","committed_at");