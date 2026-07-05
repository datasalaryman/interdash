# interdash

A personal web RSS reader for data stored in PostgreSQL tables shaped after Newsboat's SQLite cache schema.

## Stack

- TanStack Start + React + Bun
- Tailwind CSS + shadcn/ui-style components
- TanStack Form for the search form
- Drizzle ORM + PostgreSQL
- oRPC API with OpenAPI docs at `/api/docs`
- Redis read-through caching via `REDIS_URL`
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

## Database

The Drizzle schema lives in `src/db/schema.ts`. TypeScript object names stay short, like `rssFeed` and `rssItem`, but physical database tables are prefixed for shared database safety: `interdash_rss_feed`, `interdash_rss_item`, `interdash_google_replay`, and `interdash_metadata`. Newsboat column names such as `rssurl`, `feedurl`, and `pubDate` are preserved.

Useful commands:

```bash
bun run db:generate
bun run db:push
bun run db:migrate
bun run db:studio
```

## API

- `GET /api/feeds`
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
