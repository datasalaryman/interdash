import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { job, rssFeed } from "@/db/schema";

export type EnqueuedFeedJob = { id: string; rssurl: string };

export type EnqueueFeedBatchResult = {
	imported: Array<EnqueuedFeedJob>;
	skipped: Array<string>;
	failed: Array<{ rssurl: string; error: string }>;
};

export function normalizeHttpUrl(value: string) {
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

export async function enqueueFeed(value: string): Promise<EnqueuedFeedJob> {
	const db = getDb();
	if (!db) throw new Error("DATABASE_URL is not configured.");

	const rssurl = normalizeHttpUrl(value);
	const [created] = await db
		.insert(job)
		.values({ targetUrl: rssurl, type: "feed" })
		.returning({ id: job.id });

	if (!created) throw new Error("Unable to create feed job.");
	return { id: created.id, rssurl };
}

export async function enqueueFeedBatch(
	text: string,
): Promise<EnqueueFeedBatchResult> {
	const urls = parseFeedBatch(text);
	if (urls.length === 0) {
		throw new Error("The file does not contain any feed URLs.");
	}

	const db = getDb();
	if (!db) throw new Error("DATABASE_URL is not configured.");

	const result: EnqueueFeedBatchResult = {
		imported: [],
		skipped: [],
		failed: [],
	};

	for (const value of urls) {
		let rssurl = value;
		try {
			rssurl = normalizeHttpUrl(value);
			const existing = await db
				.select({ rssurl: rssFeed.rssurl })
				.from(rssFeed)
				.where(eq(rssFeed.rssurl, rssurl))
				.limit(1);
			if (existing.length > 0) {
				result.skipped.push(rssurl);
				continue;
			}
			result.imported.push(await enqueueFeed(rssurl));
		} catch (error) {
			result.failed.push({
				error: error instanceof Error ? error.message : "Unable to queue feed.",
				rssurl,
			});
		}
	}

	return result;
}
