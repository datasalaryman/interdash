import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export type JobType = "feed" | "article";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export const job = pgTable(
	"interdash_jobs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		type: varchar("type", { length: 32 }).$type<JobType>().notNull(),
		status: varchar("status", { length: 32 })
			.$type<JobStatus>()
			.notNull()
			.default("pending"),
		targetUrl: varchar("target_url", { length: 2048 }).notNull(),
		feedUrl: varchar("feed_url", { length: 1024 }),
		articleGuid: varchar("article_guid", { length: 64 }),
		attempts: integer("attempts").notNull().default(0),
		maxAttempts: integer("max_attempts").notNull().default(3),
		error: text("error"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		check(
			"interdash_jobs_type_check",
			sql`${table.type} in ('feed', 'article')`,
		),
		check(
			"interdash_jobs_status_check",
			sql`${table.status} in ('pending', 'processing', 'completed', 'failed')`,
		),
		index("interdash_jobs_status_created_idx").on(
			table.status,
			table.createdAt,
		),
	],
);

export const rssFeed = pgTable(
	"interdash_rss_feed",
	{
		rssurl: varchar("rssurl", { length: 1024 }).primaryKey().notNull(),
		url: varchar("url", { length: 1024 }).notNull().default(""),
		title: varchar("title", { length: 1024 }).notNull().default(""),
		lastmodified: integer("lastmodified").notNull().default(0),
		isRtl: integer("is_rtl").notNull().default(0),
		etag: varchar("etag", { length: 128 }).notNull().default(""),
	},
	(table) => [
		index("interdash_idx_rssurl").on(table.rssurl),
		index("interdash_idx_lastmodified").on(table.lastmodified),
	],
);

export const rssItem = pgTable(
	"interdash_rss_item",
	{
		id: serial("id").primaryKey().notNull(),
		guid: varchar("guid", { length: 64 }).notNull(),
		title: varchar("title", { length: 1024 }).notNull().default(""),
		author: varchar("author", { length: 1024 }).notNull().default(""),
		url: varchar("url", { length: 1024 }).notNull().default(""),
		feedurl: varchar("feedurl", { length: 1024 }).notNull(),
		pubDate: integer("pubDate").notNull().default(0),
		content: text("content").notNull().default(""),
		contentMimeType: varchar("content_mime_type", { length: 255 })
			.notNull()
			.default(""),
		unread: integer("unread").notNull().default(1),
		enclosureUrl: varchar("enclosure_url", { length: 1024 }),
		enclosureType: varchar("enclosure_type", { length: 1024 }),
		enclosureDescription: varchar("enclosure_description", { length: 1024 })
			.notNull()
			.default(""),
		enclosureDescriptionMimeType: varchar("enclosure_description_mime_type", {
			length: 128,
		})
			.notNull()
			.default(""),
		enqueued: integer("enqueued").notNull().default(0),
		flags: varchar("flags", { length: 52 }),
		base: varchar("base", { length: 128 }).notNull().default(""),
		deleted: integer("deleted").notNull().default(0),
	},
	(table) => [
		index("interdash_idx_guid").on(table.guid),
		index("interdash_idx_feedurl").on(table.feedurl),
		index("interdash_idx_deleted").on(table.deleted),
		index("interdash_idx_feedurl_pubdate").on(table.feedurl, table.pubDate),
	],
);

export const googleReplay = pgTable("interdash_google_replay", {
	id: serial("id").primaryKey().notNull(),
	guid: varchar("guid", { length: 64 }).notNull(),
	state: integer("state").notNull(),
	ts: integer("ts").notNull(),
});

export const metadata = pgTable("interdash_metadata", {
	dbSchemaVersionMajor: integer("db_schema_version_major").notNull(),
	dbSchemaVersionMinor: integer("db_schema_version_minor").notNull(),
});
