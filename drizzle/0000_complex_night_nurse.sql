CREATE TABLE "interdash_google_replay" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(64) NOT NULL,
	"state" integer NOT NULL,
	"ts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interdash_metadata" (
	"db_schema_version_major" integer NOT NULL,
	"db_schema_version_minor" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interdash_rss_feed" (
	"rssurl" varchar(1024) PRIMARY KEY NOT NULL,
	"url" varchar(1024) DEFAULT '' NOT NULL,
	"title" varchar(1024) DEFAULT '' NOT NULL,
	"lastmodified" integer DEFAULT 0 NOT NULL,
	"is_rtl" integer DEFAULT 0 NOT NULL,
	"etag" varchar(128) DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interdash_rss_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" varchar(64) NOT NULL,
	"title" varchar(1024) DEFAULT '' NOT NULL,
	"author" varchar(1024) DEFAULT '' NOT NULL,
	"url" varchar(1024) DEFAULT '' NOT NULL,
	"feedurl" varchar(1024) NOT NULL,
	"pubDate" integer DEFAULT 0 NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"content_mime_type" varchar(255) DEFAULT '' NOT NULL,
	"unread" integer DEFAULT 1 NOT NULL,
	"enclosure_url" varchar(1024),
	"enclosure_type" varchar(1024),
	"enclosure_description" varchar(1024) DEFAULT '' NOT NULL,
	"enclosure_description_mime_type" varchar(128) DEFAULT '' NOT NULL,
	"enqueued" integer DEFAULT 0 NOT NULL,
	"flags" varchar(52),
	"base" varchar(128) DEFAULT '' NOT NULL,
	"deleted" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "interdash_idx_rssurl" ON "interdash_rss_feed" USING btree ("rssurl");--> statement-breakpoint
CREATE INDEX "interdash_idx_lastmodified" ON "interdash_rss_feed" USING btree ("lastmodified");--> statement-breakpoint
CREATE INDEX "interdash_idx_guid" ON "interdash_rss_item" USING btree ("guid");--> statement-breakpoint
CREATE INDEX "interdash_idx_feedurl" ON "interdash_rss_item" USING btree ("feedurl");--> statement-breakpoint
CREATE INDEX "interdash_idx_deleted" ON "interdash_rss_item" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "interdash_idx_feedurl_pubdate" ON "interdash_rss_item" USING btree ("feedurl","pubDate");