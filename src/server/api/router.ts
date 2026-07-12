import { ORPCError, os } from "@orpc/server";
import { z } from "zod";

import { enqueueFeed, enqueueFeedBatch } from "@/lib/jobs";
import {
	getArticleCached,
	listArticlesCached,
	listFeedsCached,
	markFeedRead,
	setArticleUnread,
} from "@/lib/newsboat";

const feedSummarySchema = z.object({
	rssurl: z.string(),
	url: z.string(),
	title: z.string(),
	articleCount: z.number(),
	unreadCount: z.number(),
	latestPubDate: z.number().nullable(),
});

const articleSummarySchema = z.object({
	guid: z.string(),
	title: z.string(),
	author: z.string(),
	url: z.string(),
	feedurl: z.string(),
	feedTitle: z.string(),
	pubDate: z.number(),
	unread: z.boolean(),
	flags: z.string().nullable(),
	excerpt: z.string(),
});

const articleDetailSchema = articleSummarySchema.extend({
	content: z.string(),
	contentText: z.string(),
	contentMimeType: z.string(),
	enclosureUrl: z.string().nullable(),
	enclosureType: z.string().nullable(),
});

const addFeedResultSchema = z.object({
	id: z.string().uuid(),
	rssurl: z.string(),
});

const importFeedBatchResultSchema = z.object({
	imported: z.array(addFeedResultSchema),
	skipped: z.array(z.string()),
	failed: z.array(z.object({ rssurl: z.string(), error: z.string() })),
});

export const apiRouter = {
	feeds: {
		list: os
			.route({ method: "GET", path: "/feeds" })
			.output(z.array(feedSummarySchema))
			.handler(async () => listFeedsCached()),
		create: os
			.route({ method: "POST", path: "/feeds" })
			.input(z.object({ rssurl: z.string().min(1) }))
			.output(addFeedResultSchema)
			.handler(async ({ input }) => enqueueFeed(input.rssurl)),
		importBatch: os
			.route({ method: "POST", path: "/feeds/import" })
			.input(z.object({ text: z.string().min(1) }))
			.output(importFeedBatchResultSchema)
			.handler(async ({ input }) => enqueueFeedBatch(input.text)),
		markRead: os
			.route({ method: "POST", path: "/feeds/{rssurl}/read" })
			.input(z.object({ rssurl: z.string() }))
			.output(z.object({ updated: z.number() }))
			.handler(async ({ input }) => markFeedRead(input.rssurl)),
	},
	articles: {
		list: os
			.route({ method: "GET", path: "/articles" })
			.input(
				z.object({
					feedurl: z.string().optional(),
					q: z.string().optional(),
					limit: z.coerce.number().int().min(1).max(100).optional(),
				}),
			)
			.output(z.array(articleSummarySchema))
			.handler(async ({ input }) => listArticlesCached(input)),
		find: os
			.route({ method: "GET", path: "/articles/{guid}" })
			.input(z.object({ guid: z.string() }))
			.output(articleDetailSchema)
			.handler(async ({ input }) => {
				const article = await getArticleCached(input.guid);

				if (!article) {
					throw new ORPCError("NOT_FOUND", { message: "Article not found" });
				}

				return article;
			}),
		setUnread: os
			.route({ method: "POST", path: "/articles/{guid}/unread" })
			.input(z.object({ guid: z.string(), unread: z.boolean().default(false) }))
			.output(articleDetailSchema)
			.handler(async ({ input }) => {
				const article = await setArticleUnread(input.guid, input.unread);

				if (!article) {
					throw new ORPCError("NOT_FOUND", { message: "Article not found" });
				}

				return article;
			}),
	},
};

export type ApiRouter = typeof apiRouter;
