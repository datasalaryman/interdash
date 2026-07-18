# interdash

A personal web RSS reader for data stored in PostgreSQL tables shaped after Newsboat's SQLite cache schema.

## Stack

- TanStack Start + React + Bun
- Tailwind CSS + shadcn/ui-style components
- TanStack Form for the search form
- Drizzle ORM + PostgreSQL
- oRPC API with OpenAPI docs at `/api/docs`
- Redis read-through caching via `REDIS_URL`
- Standalone PostgreSQL logical-replication ingestion worker
- Biome linting and formatting
- Nitro deployment output, with Vercel using the Bun runtime

## Setup

```bash
bun install
cp .env.example .env
bun run db:push
bun --bun run dev
```

Set these environment variables:

- `DATABASE_URL`: PostgreSQL connection string for Newsboat-shaped tables.
- `REDIS_URL`: Redis connection string for cached API reads. If omitted, reads still work without caching.
- `WORKER_PUBLICATION`: Logical replication publication name. Defaults to `interdash_jobs_publication`.
- `WORKER_REPLICATION_SLOT`: Logical replication slot name. Defaults to `interdash_jobs_worker`.
- `WORKER_LOGICAL_REPLICATION_ENABLED`: Set to `false` to process jobs by polling without requiring PostgreSQL logical replication. Defaults to `true`.
- `WORKER_POLL_INTERVAL_MS`: Safety-net polling interval. Defaults to 30 seconds.

## Database

The Drizzle schema lives in `src/db/schema.ts`. TypeScript object names stay short, like `rssFeed` and `rssItem`, but physical database tables are prefixed for shared database safety: `interdash_rss_feed`, `interdash_rss_item`, `interdash_google_replay`, and `interdash_metadata`. Newsboat column names such as `rssurl`, `feedurl`, and `pubDate` are preserved.

`interdash_jobs` is the durable ingestion queue. Feed creation endpoints now insert a `feed` job instead of fetching the feed in the web process. The worker also supports `article` jobs; those require `target_url`, `feed_url`, and `article_guid`.

Useful commands:

```bash
bun run db:generate
bun run db:push
bun run db:migrate
bun run db:studio
```

## Worker

The worker is independent of the built web app and starts with:

```bash
bun run worker
```

It receives inserts into `interdash_jobs` through PostgreSQL's native `pgoutput` logical replication plugin. It also scans pending jobs at startup and every `WORKER_POLL_INTERVAL_MS`, so a replication disconnect cannot strand durable work. Job claims use `FOR UPDATE SKIP LOCKED`, but only one worker can consume a given replication slot at a time. Run one worker with the default slot, or assign each worker a unique slot. Each additional slot retains WAL independently and must be monitored.

### Required setup

The generated migration is included but has not been applied or pushed. Before starting the worker:

1. Review the generated migration, then apply it using your normal database deployment process.
2. Enable logical replication on PostgreSQL. For a self-hosted server, set `wal_level = logical` and restart PostgreSQL. Managed providers expose an equivalent setting.
3. Connect as a role allowed to manage logical replication and create the publication and slot:

```sql
CREATE PUBLICATION interdash_jobs_publication
FOR TABLE public.interdash_jobs
WITH (publish = 'insert');

SELECT pg_create_logical_replication_slot(
  'interdash_jobs_worker',
  'pgoutput'
);
```

4. Grant the worker's database role normal read/write access to `interdash_jobs`, `interdash_rss_feed`, and `interdash_rss_item`, plus replication permission. The exact replication grant depends on your PostgreSQL provider.
5. Deploy `bun run worker` as a continuously running process with the same `DATABASE_URL` as the web app. Do not run it in a request-based/serverless function.

Publication and slot names must match the worker environment variables. A replication slot retains WAL while disconnected, so monitor slot lag and remove an abandoned slot with `SELECT pg_drop_replication_slot('interdash_jobs_worker');` only after the worker has been permanently retired.

### Railway

`railway.json` configures this repository as a continuously running worker service. It uses Railpack's Bun detection, runs `bun run worker`, restarts the worker, and prevents deployment overlap because one replication slot cannot be consumed by two worker instances.

1. Create a Railway service from this repository and add a PostgreSQL service to the same project, or use an existing PostgreSQL provider.
2. Set `DATABASE_URL` on the worker. For Railway PostgreSQL, use a reference variable such as `${{Postgres.DATABASE_URL}}`, replacing `Postgres` if the database service has a different name.
3. Apply the checked-in migrations once with `bun run db:migrate`, either from a Railway one-off shell or from a trusted deployment environment using the production `DATABASE_URL`.
4. For an initial Railway PostgreSQL deployment, set `WORKER_LOGICAL_REPLICATION_ENABLED=false`. The worker will safely claim jobs at startup and every `WORKER_POLL_INTERVAL_MS` without a publication or slot.
5. To receive jobs immediately, configure PostgreSQL logical replication using the SQL and grants above, then set `WORKER_LOGICAL_REPLICATION_ENABLED=true`. Railway PostgreSQL allows server settings to be changed with `ALTER SYSTEM`; changing `wal_level` requires restarting the PostgreSQL service.

Keep the worker at one replica when logical replication is enabled. Polling-only mode supports multiple replicas because job claims use `FOR UPDATE SKIP LOCKED`, though one replica is normally sufficient.

## API

- `GET /api/feeds`
- `POST /api/feeds`
- `POST /api/feeds/{rssurl}/read`
- `GET /api/articles`
- `GET /api/articles/{guid}`
- `POST /api/articles/{guid}/unread`
- `GET /api/docs`

## Verification

```bash
bun run check
bunx tsc --noEmit
bun run build
VERCEL=1 bun run build
```
