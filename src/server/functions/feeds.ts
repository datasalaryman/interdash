import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const addFeedInputSchema = z.object({
	rssurl: z.string().min(1, "Enter a feed URL."),
});

const importFeedBatchInputSchema = z.object({
	text: z.string().min(1, "The selected file is empty."),
});

export const addFeed = createServerFn({ method: "POST" })
	.validator((input) => addFeedInputSchema.parse(input))
	.handler(async ({ data }) => {
		const { addFeedFromUrl } = await import("@/lib/newsboat");

		return addFeedFromUrl(data.rssurl);
	});

export const importFeedBatch = createServerFn({ method: "POST" })
	.validator((input) => importFeedBatchInputSchema.parse(input))
	.handler(async ({ data }) => {
		const { importFeedBatch: importBatch } = await import("@/lib/newsboat");

		return importBatch(data.text);
	});
