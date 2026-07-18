import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
	LogicalReplicationService,
	type Pgoutput,
	PgoutputPlugin,
} from "pg-logical-replication";

import { fetchRssFeed, type ParsedRssItem } from "../src/lib/rss";

type Job = {
	id: string;
	type: "feed" | "article";
	target_url: string;
	feed_url: string | null;
	article_guid: string | null;
	attempts: number;
	max_attempts: number;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const publicationName =
	process.env.WORKER_PUBLICATION ?? "interdash_jobs_publication";
const slotName = process.env.WORKER_REPLICATION_SLOT ?? "interdash_jobs_worker";
const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 30_000);
const logicalReplicationEnabled =
	process.env.WORKER_LOGICAL_REPLICATION_ENABLED !== "false";
const pool = new Pool({ connectionString: databaseUrl });
let draining = false;
let stopping = false;

function truncate(value: string | null | undefined, length: number) {
	return value ? value.slice(0, length) : "";
}

function itemGuid(feedUrl: string, item: ParsedRssItem, index: number) {
	const source =
		item.sourceId || item.url || `${item.title}:${item.pubDate}:${index}`;
	return createHash("sha256").update(`${feedUrl}\n${source}`).digest("hex");
}

async function claimJob(): Promise<Job | null> {
	const result = await pool.query<Job>(`
		WITH candidate AS (
			SELECT id
			FROM interdash_jobs
			WHERE attempts < max_attempts
				AND (
					status = 'pending'
					OR (status = 'processing' AND started_at < now() - interval '15 minutes')
				)
			ORDER BY created_at
			FOR UPDATE SKIP LOCKED
			LIMIT 1
		)
		UPDATE interdash_jobs AS jobs
		SET status = 'processing', attempts = attempts + 1, started_at = now(),
			updated_at = now(), error = NULL
		FROM candidate
		WHERE jobs.id = candidate.id
		RETURNING jobs.*
	`);
	return result.rows[0] ?? null;
}

async function ingestFeed(job: Job) {
	const feed = await fetchRssFeed(job.target_url);
	const client = await pool.connect();

	try {
		await client.query("BEGIN");
		await client.query(
			`INSERT INTO interdash_rss_feed
				(rssurl, url, title, lastmodified, etag)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (rssurl) DO UPDATE SET
				url = EXCLUDED.url, title = EXCLUDED.title,
				lastmodified = EXCLUDED.lastmodified, etag = EXCLUDED.etag`,
			[
				job.target_url,
				truncate(feed.siteUrl, 1024),
				truncate(feed.title || job.target_url, 1024),
				feed.lastModified,
				truncate(feed.etag, 128),
			],
		);

		for (const [index, item] of feed.items.entries()) {
			const guid = itemGuid(job.target_url, item, index);
			const values = [
				truncate(item.title || "Untitled article", 1024),
				truncate(item.author, 1024),
				truncate(item.url, 1024),
				item.pubDate,
				item.content,
				truncate(item.contentMimeType, 255),
				item.enclosureUrl ? truncate(item.enclosureUrl, 1024) : null,
				item.enclosureType ? truncate(item.enclosureType, 1024) : null,
				job.target_url,
				guid,
			];
			const updated = await client.query(
				`UPDATE interdash_rss_item SET title = $1, author = $2, url = $3,
					"pubDate" = $4, content = $5, content_mime_type = $6,
					enclosure_url = $7, enclosure_type = $8, deleted = 0
				 WHERE feedurl = $9 AND guid = $10`,
				values,
			);
			if ((updated.rowCount ?? 0) === 0) {
				await client.query(
					`INSERT INTO interdash_rss_item
						(title, author, url, "pubDate", content, content_mime_type,
						enclosure_url, enclosure_type, feedurl, guid)
					 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
					values,
				);
			}
		}
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

async function ingestArticle(job: Job) {
	if (!job.feed_url || !job.article_guid) {
		throw new Error("Article jobs require feed_url and article_guid.");
	}
	const response = await fetch(job.target_url, {
		headers: { "User-Agent": "interdash/article-fetcher" },
	});
	if (!response.ok) {
		throw new Error(`Article request failed with HTTP ${response.status}.`);
	}
	const content = await response.text();
	const contentType = truncate(
		response.headers.get("content-type")?.split(";", 1)[0],
		255,
	);
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await ensureFeedExists(client, job.feed_url);
		const updated = await client.query(
			`UPDATE interdash_rss_item SET content = $1, content_mime_type = $2,
				url = $3, deleted = 0 WHERE feedurl = $4 AND guid = $5`,
			[content, contentType, job.target_url, job.feed_url, job.article_guid],
		);
		if ((updated.rowCount ?? 0) === 0) {
			await client.query(
				`INSERT INTO interdash_rss_item
					(guid, title, url, feedurl, content, content_mime_type)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				[
					job.article_guid,
					truncate(job.target_url, 1024),
					truncate(job.target_url, 1024),
					job.feed_url,
					content,
					contentType,
				],
			);
		}
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

async function ensureFeedExists(client: PoolClient, feedUrl: string) {
	await client.query(
		`INSERT INTO interdash_rss_feed (rssurl, url, title)
		 VALUES ($1, $1, $1) ON CONFLICT (rssurl) DO NOTHING`,
		[feedUrl],
	);
}

async function processJob(job: Job) {
	try {
		if (job.type === "feed") {
			await ingestFeed(job);
		} else {
			await ingestArticle(job);
		}
		await pool.query(
			`UPDATE interdash_jobs SET status = 'completed',
				completed_at = now(), updated_at = now() WHERE id = $1`,
			[job.id],
		);
		console.info(`[worker] completed ${job.type} job ${job.id}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const status = job.attempts >= job.max_attempts ? "failed" : "pending";
		await pool.query(
			`UPDATE interdash_jobs SET status = $2, error = $3,
				completed_at = CASE WHEN $2 = 'failed' THEN now() ELSE NULL END,
				updated_at = now() WHERE id = $1`,
			[job.id, status, message],
		);
		console.error(`[worker] ${status} ${job.type} job ${job.id}: ${message}`);
	}
}

async function drainJobs() {
	if (draining || stopping) return;
	draining = true;
	try {
		for (let next = await claimJob(); next; next = await claimJob()) {
			await processJob(next);
		}
	} finally {
		draining = false;
	}
}

const replication = logicalReplicationEnabled
	? new LogicalReplicationService(
			{ connectionString: databaseUrl },
			{
				acknowledge: { auto: true, timeoutSeconds: 10 },
				flowControl: { enabled: true },
			},
		)
	: null;
const plugin = logicalReplicationEnabled
	? new PgoutputPlugin({
			protoVersion: 1,
			publicationNames: [publicationName],
		})
	: null;

replication?.on("data", (_lsn: string, message: Pgoutput.Message) => {
	if (
		message.tag === "insert" &&
		message.relation.schema === "public" &&
		message.relation.name === "interdash_jobs"
	) {
		void drainJobs();
	}
});
replication?.on("error", (error) =>
	console.error("[worker] replication error", error),
);

async function subscribe() {
	if (!replication || !plugin) return;

	while (!stopping) {
		try {
			await replication.subscribe(plugin, slotName);
		} catch (error) {
			console.error("[worker] replication disconnected", error);
		}
		if (!stopping) await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
}

async function shutdown() {
	if (stopping) return;
	stopping = true;
	console.info("[worker] shutting down");
	await replication?.stop();
	await pool.end();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
setInterval(() => void drainJobs(), pollIntervalMs).unref();
console.info(
	logicalReplicationEnabled
		? `[worker] listening via slot ${slotName} and publication ${publicationName}`
		: `[worker] polling every ${pollIntervalMs}ms (logical replication disabled)`,
);
void drainJobs();
if (logicalReplicationEnabled) void subscribe();
