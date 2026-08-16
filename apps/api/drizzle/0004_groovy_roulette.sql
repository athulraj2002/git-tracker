ALTER TABLE "tracked_repos" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tracked_repos" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "tracked_repos" ADD COLUMN "default_branch" text;--> statement-breakpoint
ALTER TABLE "tracked_repos" ADD COLUMN "stars" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_repos" ADD COLUMN "forks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_repos" ADD COLUMN "open_issues" integer DEFAULT 0 NOT NULL;