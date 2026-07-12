import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";

import { getDb, hasDatabaseUrl } from "@/db";
import { rssFeed, rssItem } from "@/db/schema";
import { deleteCacheKeys, readThroughCache } from "@/lib/cache";
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

export async function deleteFeeds(feedurls: Array<string>) {
	console.info(
		`[POST /feeds/delete-batch] called for ${feedurls.length} feeds`,
	);
	const db = getDb();

	if (!db) {
		throw new Error("DATABASE_URL is not configured.");
	}

	try {
		const result = await db.transaction(async (tx) => {
			const articlesResult = await tx
				.delete(rssItem)
				.where(inArray(rssItem.feedurl, feedurls));
			const feedsResult = await tx
				.delete(rssFeed)
				.where(inArray(rssFeed.rssurl, feedurls));

			if ((feedsResult.rowCount ?? 0) !== feedurls.length) {
				throw new Error("One or more feeds were not found.");
			}

			return {
				deletedArticles: articlesResult.rowCount ?? 0,
				deletedFeeds: feedsResult.rowCount ?? 0,
			};
		});

		await deleteCacheKeys(["newsboat:feeds"]);
		console.info(
			`[POST /feeds/delete-batch] deleted ${result.deletedArticles} articles and ${result.deletedFeeds} feeds`,
		);

		return result;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unable to delete feeds.";
		console.error(`[POST /feeds/delete-batch] error: ${message}`);
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
