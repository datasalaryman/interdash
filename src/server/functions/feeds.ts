import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const addFeedInputSchema = z.object({
	rssurl: z.string().min(1, "Enter a feed URL."),
});

export const addFeed = createServerFn({ method: "POST" })
	.validator((input) => addFeedInputSchema.parse(input))
	.handler(async ({ data }) => {
		const { addFeedFromUrl } = await import("@/lib/newsboat");

		return addFeedFromUrl(data.rssurl);
	});
