CREATE TABLE "interdash_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"target_url" varchar(2048) NOT NULL,
	"feed_url" varchar(1024),
	"article_guid" varchar(64),
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interdash_jobs_type_check" CHECK ("interdash_jobs"."type" in ('feed', 'article')),
	CONSTRAINT "interdash_jobs_status_check" CHECK ("interdash_jobs"."status" in ('pending', 'processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX "interdash_jobs_status_created_idx" ON "interdash_jobs" USING btree ("status","created_at");