import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const getArticleDetailInputSchema = z.object({
	guid: z.string().min(1),
});

export const getArticleDetail = createServerFn({ method: "GET" })
	.validator((input) => getArticleDetailInputSchema.parse(input))
	.handler(async ({ data }) => {
		const { getArticleCached } = await import("@/lib/newsboat");

		return getArticleCached(data.guid);
	});
