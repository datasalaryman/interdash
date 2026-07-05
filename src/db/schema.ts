import {
	index,
	integer,
	pgTable,
	serial,
	text,
	varchar,
} from "drizzle-orm/pg-core";

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
