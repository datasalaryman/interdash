import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const addFeedInputSchema = z.object({
	rssurl: z.string().min(1, "Enter a feed URL."),
});

const importFeedBatchInputSchema = z.object({
	text: z.string().min(1, "The selected file is empty."),
});

const deleteFeedInputSchema = z.object({
	rssurl: z.string().min(1, "Feed URL is required."),
});

const deleteFeedsInputSchema = z.object({
	feedurls: z.array(z.string().min(1)).min(1, "Select at least one feed."),
});

export const addFeed = createServerFn({ method: "POST" })
	.validator((input) => addFeedInputSchema.parse(input))
	.handler(async ({ data }) => {
		const { enqueueFeed } = await import("@/lib/jobs");

		return enqueueFeed(data.rssurl);
	});

export const importFeedBatch = createServerFn({ method: "POST" })
	.validator((input) => importFeedBatchInputSchema.parse(input))
	.handler(async ({ data }) => {
		const { enqueueFeedBatch } = await import("@/lib/jobs");

		return enqueueFeedBatch(data.text);
	});

export const deleteFeed = createServerFn({ method: "POST" })
	.validator((input) => deleteFeedInputSchema.parse(input))
	.handler(async ({ data }) => {
		const { deleteFeed: removeFeed } = await import("@/lib/newsboat");

		return removeFeed(data.rssurl);
	});

export const deleteFeeds = createServerFn({ method: "POST" })
	.validator((input) => deleteFeedsInputSchema.parse(input))
	.handler(async ({ data }) => {
		const { deleteFeeds: removeFeeds } = await import("@/lib/newsboat");

		return removeFeeds(data.feedurls);
	});
