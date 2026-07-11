import { createHash } from "node:crypto";

import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";

import { getDb, hasDatabaseUrl } from "@/db";
import { rssFeed, rssItem } from "@/db/schema";
import { deleteCacheKeys, readThroughCache } from "@/lib/cache";
import { fetchRssFeed, type ParsedRssItem } from "@/lib/rss";
import { excerpt, toPlainText } from "@/lib/text";

export type ReaderSearch = {
	feed?: string;
	q?: string;
};

export type FeedSummary = {
	rssurl: string;
	url: string;
	title: string;
	articleCount: number;
	unreadCount: number;
	latestPubDate: number | null;
};

export type ArticleSummary = {
	guid: string;
	title: string;
	author: string;
	url: string;
	feedurl: string;
	feedTitle: string;
	pubDate: number;
	unread: boolean;
	flags: string | null;
	excerpt: string;
};

export type ArticleDetail = ArticleSummary & {
	content: string;
	contentText: string;
	contentMimeType: string;
	enclosureUrl: string | null;
	enclosureType: string | null;
};

export type ReaderData = {
	isDatabaseConfigured: boolean;
	feeds: Array<FeedSummary>;
	articles: Array<ArticleSummary>;
	selectedFeedUrl?: string;
	totalUnread: number;
};

export type AddFeedResult = {
	feed: FeedSummary;
	itemCount: number;
	insertedCount: number;
	updatedCount: number;
};

export type ImportFeedBatchResult = {
	imported: Array<AddFeedResult>;
	skipped: Array<string>;
	failed: Array<{ rssurl: string; error: string }>;
};

export function parseFeedBatch(text: string): Array<string> {
	return [
		...new Set(
			text
				.split(/\r?\n/)
				.map((line) => line.split("#", 1)[0]?.trim() ?? "")
				.filter(Boolean),
		),
	];
}

type ListArticlesInput = {
	feedurl?: string;
	q?: string;
	limit?: number;
};

function toFeedSummary(row: {
	rssurl: string;
	url: string;
	title: string;
	articleCount: number | string | null;
	unreadCount: number | string | null;
	latestPubDate: number | string | null;
}): FeedSummary {
	return {
		rssurl: row.rssurl,
		url: row.url,
		title: row.title || row.rssurl,
		articleCount: Number(row.articleCount ?? 0),
		unreadCount: Number(row.unreadCount ?? 0),
		latestPubDate:
			row.latestPubDate === null ? null : Number(row.latestPubDate),
	};
}

function toArticleSummary(row: {
	guid: string;
	title: string;
	author: string;
	url: string;
	feedurl: string;
	feedTitle: string | null;
	pubDate: number;
	unread: number;
	flags: string | null;
	content: string;
}): ArticleSummary {
	return {
		guid: row.guid,
		title: row.title || "Untitled article",
		author: row.author,
		url: row.url,
		feedurl: row.feedurl,
		feedTitle: row.feedTitle || row.feedurl,
		pubDate: row.pubDate,
		unread: row.unread !== 0,
		flags: row.flags,
		excerpt: excerpt(row.content),
	};
}

function toArticleDetail(row: {
	guid: string;
	title: string;
	author: string;
	url: string;
	feedurl: string;
	feedTitle: string | null;
	pubDate: number;
	unread: number;
	flags: string | null;
	content: string;
	contentMimeType: string;
	enclosureUrl: string | null;
	enclosureType: string | null;
}): ArticleDetail {
	const summary = toArticleSummary(row);

	return {
		...summary,
		content: row.content,
		contentText: toPlainText(row.content),
		contentMimeType: row.contentMimeType,
		enclosureUrl: row.enclosureUrl,
		enclosureType: row.enclosureType,
	};
}

function truncate(value: string | null | undefined, maxLength: number) {
	if (!value) {
		return "";
	}

	return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeHttpUrl(value: string) {
	let url: URL;

	try {
		url = new URL(value.trim());
	} catch {
		throw new Error("Enter a valid feed URL.");
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new Error("Feed URL must start with http:// or https://.");
	}

	url.hash = "";

	const normalized = url.toString();

	if (normalized.length > 1024) {
		throw new Error("Feed URL is too long.");
	}

	return normalized;
}

function itemGuid(feedurl: string, item: ParsedRssItem, index: number) {
	const source =
		item.sourceId || item.url || `${item.title}:${item.pubDate}:${index}`;

	return createHash("sha256").update(`${feedurl}\n${source}`).digest("hex");
}

function itemValues(feedurl: string, item: ParsedRssItem, index: number) {
	return {
		author: truncate(item.author, 1024),
		content: item.content,
		contentMimeType: truncate(item.contentMimeType, 255),
		deleted: 0,
		enclosureType: item.enclosureType
			? truncate(item.enclosureType, 1024)
			: null,
		enclosureUrl: item.enclosureUrl ? truncate(item.enclosureUrl, 1024) : null,
		feedurl,
		guid: itemGuid(feedurl, item, index),
		pubDate: item.pubDate,
		title: truncate(item.title || "Untitled article", 1024),
		url: truncate(item.url, 1024),
	};
}

export async function listFeeds() {
	const db = getDb();

	if (!db) {
		return [];
	}

	const rows = await db
		.select({
			rssurl: rssFeed.rssurl,
			url: rssFeed.url,
			title: rssFeed.title,
			articleCount: sql<number>`count(${rssItem.guid}) filter (where ${rssItem.deleted} = 0)`,
			unreadCount: sql<number>`count(${rssItem.guid}) filter (where ${rssItem.deleted} = 0 and ${rssItem.unread} <> 0)`,
			latestPubDate: sql<number | null>`max(${rssItem.pubDate})`,
		})
		.from(rssFeed)
		.leftJoin(rssItem, eq(rssItem.feedurl, rssFeed.rssurl))
		.groupBy(rssFeed.rssurl, rssFeed.url, rssFeed.title)
		.orderBy(desc(sql`max(${rssItem.pubDate})`), rssFeed.title);

	return rows.map(toFeedSummary);
}

export async function listFeedsCached() {
	return readThroughCache("newsboat:feeds", listFeeds);
}

export async function addFeedFromUrl(value: string): Promise<AddFeedResult> {
	const db = getDb();

	if (!db) {
		throw new Error("DATABASE_URL is not configured.");
	}

	const rssurl = normalizeHttpUrl(value);
	const feed = await fetchRssFeed(rssurl);
	let insertedCount = 0;
	let updatedCount = 0;

	await db.transaction(async (tx) => {
		await tx
			.insert(rssFeed)
			.values({
				etag: truncate(feed.etag, 128),
				lastmodified: feed.lastModified,
				rssurl,
				title: truncate(feed.title || rssurl, 1024),
				url: truncate(feed.siteUrl, 1024),
			})
			.onConflictDoUpdate({
				set: {
					etag: truncate(feed.etag, 128),
					lastmodified: feed.lastModified,
					title: truncate(feed.title || rssurl, 1024),
					url: truncate(feed.siteUrl, 1024),
				},
				target: rssFeed.rssurl,
			});

		for (const [index, item] of feed.items.entries()) {
			const values = itemValues(rssurl, item, index);
			const result = await tx
				.update(rssItem)
				.set({
					author: values.author,
					content: values.content,
					contentMimeType: values.contentMimeType,
					deleted: values.deleted,
					enclosureType: values.enclosureType,
					enclosureUrl: values.enclosureUrl,
					pubDate: values.pubDate,
					title: values.title,
					url: values.url,
				})
				.where(and(eq(rssItem.feedurl, rssurl), eq(rssItem.guid, values.guid)));

			if ((result.rowCount ?? 0) > 0) {
				updatedCount += result.rowCount ?? 0;
				continue;
			}

			await tx.insert(rssItem).values(values);
			insertedCount += 1;
		}
	});

	await deleteCacheKeys(["newsboat:feeds"]);

	const feeds = await listFeeds();
	const addedFeed = feeds.find((row) => row.rssurl === rssurl) ?? {
		articleCount: feed.items.length,
		latestPubDate: feed.items.reduce<number | null>((latest, item) => {
			if (!item.pubDate) {
				return latest;
			}

			return latest === null ? item.pubDate : Math.max(latest, item.pubDate);
		}, null),
		rssurl,
		title: feed.title || rssurl,
		unreadCount: feed.items.length,
		url: feed.siteUrl,
	};

	return {
		feed: addedFeed,
		insertedCount,
		itemCount: feed.items.length,
		updatedCount,
	};
}

export async function importFeedBatch(
	text: string,
): Promise<ImportFeedBatchResult> {
	console.info("[POST /feeds/import] called");
	const urls = parseFeedBatch(text);

	if (urls.length === 0) {
		throw new Error("The file does not contain any feed URLs.");
	}

	const db = getDb();

	if (!db) {
		throw new Error("DATABASE_URL is not configured.");
	}

	const result: ImportFeedBatchResult = {
		imported: [],
		skipped: [],
		failed: [],
	};

	for (const value of urls) {
		let rssurl = value;
		try {
			rssurl = normalizeHttpUrl(value);
			const existingFeed = await db
				.select({ rssurl: rssFeed.rssurl })
				.from(rssFeed)
				.where(eq(rssFeed.rssurl, rssurl))
				.limit(1);

			if (existingFeed.length > 0) {
				result.skipped.push(rssurl);
				console.info(`[POST /feeds/import] skipped ${rssurl}`);
				continue;
			}

			console.info(`[POST /feeds/import] started upserting ${rssurl}`);
			result.imported.push(await addFeedFromUrl(rssurl));
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to add feed.";
			result.failed.push({
				rssurl,
				error: message,
			});
			console.error(`[POST /feeds/import] error ${rssurl}: ${message}`);
		}
	}

	return result;
}

export async function listArticles({
	feedurl,
	q,
	limit = 50,
}: ListArticlesInput = {}) {
	const db = getDb();

	if (!db) {
		return [];
	}

	const conditions = [eq(rssItem.deleted, 0)];

	if (feedurl) {
		conditions.push(eq(rssItem.feedurl, feedurl));
	}

	if (q) {
		const pattern = `%${q}%`;
		const searchCondition = or(
			ilike(rssItem.title, pattern),
			ilike(rssItem.content, pattern),
		);

		if (searchCondition) {
			conditions.push(searchCondition);
		}
	}

	const rows = await db
		.select({
			guid: rssItem.guid,
			title: rssItem.title,
			author: rssItem.author,
			url: rssItem.url,
			feedurl: rssItem.feedurl,
			feedTitle: rssFeed.title,
			pubDate: rssItem.pubDate,
			unread: rssItem.unread,
			flags: rssItem.flags,
			content: rssItem.content,
		})
		.from(rssItem)
		.leftJoin(rssFeed, eq(rssFeed.rssurl, rssItem.feedurl))
		.where(and(...conditions))
		.orderBy(desc(rssItem.pubDate), desc(rssItem.id))
		.limit(limit);

	return rows.map(toArticleSummary);
}

export async function listArticlesCached(input: ListArticlesInput = {}) {
	return readThroughCache(`newsboat:articles:${JSON.stringify(input)}`, () =>
		listArticles(input),
	);
}

export async function getArticle(guid: string) {
	const db = getDb();

	if (!db) {
		return null;
	}

	const [row] = await db
		.select({
			guid: rssItem.guid,
			title: rssItem.title,
			author: rssItem.author,
			url: rssItem.url,
			feedurl: rssItem.feedurl,
			feedTitle: rssFeed.title,
			pubDate: rssItem.pubDate,
			unread: rssItem.unread,
			flags: rssItem.flags,
			content: rssItem.content,
			contentMimeType: rssItem.contentMimeType,
			enclosureUrl: rssItem.enclosureUrl,
			enclosureType: rssItem.enclosureType,
		})
		.from(rssItem)
		.leftJoin(rssFeed, eq(rssFeed.rssurl, rssItem.feedurl))
		.where(and(eq(rssItem.guid, guid), eq(rssItem.deleted, 0)))
		.limit(1);

	return row ? toArticleDetail(row) : null;
}

export async function getArticleCached(guid: string) {
	return readThroughCache(`newsboat:article:${guid}`, () => getArticle(guid));
}

export async function setArticleUnread(guid: string, unread: boolean) {
	const db = getDb();

	if (!db) {
		return null;
	}

	await db
		.update(rssItem)
		.set({ unread: unread ? 1 : 0 })
		.where(eq(rssItem.guid, guid));

	return getArticle(guid);
}

export async function markFeedRead(feedurl: string) {
	const db = getDb();

	if (!db) {
		return { updated: 0 };
	}

	const result = await db
		.update(rssItem)
		.set({ unread: 0 })
		.where(
			and(
				eq(rssItem.feedurl, feedurl),
				ne(rssItem.unread, 0),
				eq(rssItem.deleted, 0),
			),
		);

	return { updated: result.rowCount ?? 0 };
}

export async function deleteFeed(feedurl: string) {
	console.info(`[POST /feeds/delete] called ${feedurl}`);
	const db = getDb();

	if (!db) {
		throw new Error("DATABASE_URL is not configured.");
	}

	try {
		const deletedArticles = await db.transaction(async (tx) => {
			const articlesResult = await tx
				.delete(rssItem)
				.where(eq(rssItem.feedurl, feedurl));

			const result = await tx
				.delete(rssFeed)
				.where(eq(rssFeed.rssurl, feedurl));

			if ((result.rowCount ?? 0) === 0) {
				throw new Error("Feed not found.");
			}

			return articlesResult.rowCount ?? 0;
		});

		await deleteCacheKeys(["newsboat:feeds"]);
		console.info(
			`[POST /feeds/delete] deleted ${deletedArticles} articles for ${feedurl}`,
		);
		console.info(`[POST /feeds/delete] deleted feed ${feedurl}`);

		return { deleted: true };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unable to delete feed.";
		console.error(`[POST /feeds/delete] error ${feedurl}: ${message}`);
		throw error;
	}
}

export async function loadReaderData(
	search: ReaderSearch = {},
): Promise<ReaderData> {
	const feeds = await listFeeds();
	const selectedFeedUrl = search.feed || feeds[0]?.rssurl;
	const articles = await listArticles({
		feedurl: selectedFeedUrl,
		q: search.q,
	});
	return {
		isDatabaseConfigured: hasDatabaseUrl(),
		feeds,
		articles,
		selectedFeedUrl,
		totalUnread: feeds.reduce((total, feed) => total + feed.unreadCount, 0),
	};
}
