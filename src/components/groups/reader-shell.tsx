import { DatabaseIcon, RadioTowerIcon } from "lucide-react";

import { AddFeedDialog } from "@/components/blocks/add-feed-dialog";
import { ArticleDetail } from "@/components/blocks/article-detail";
import { ArticleList } from "@/components/blocks/article-list";
import { FeedList } from "@/components/blocks/feed-list";
import { ReaderSearchForm } from "@/components/blocks/reader-search-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ReaderData, ReaderSearch } from "@/lib/newsboat";

type ReaderShellProps = {
	data: ReaderData;
	search: ReaderSearch;
};

export function ReaderShell({ data, search }: ReaderShellProps) {
	return (
		<main className="mx-auto flex min-h-svh w-full max-w-[1800px] flex-col gap-4 p-3 md:p-5">
			<header className="rounded-2xl border bg-card/70 px-4 py-4 shadow-sm backdrop-blur md:px-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<RadioTowerIcon className="size-4 text-primary" />
							Personal Newsboat web reader
						</div>
						<div>
							<h1 className="font-semibold text-3xl tracking-tight md:text-4xl">
								interdash
							</h1>
							<p className="mt-1 text-muted-foreground text-sm">
								Browse feeds and articles from a PostgreSQL store shaped after
								Newsboat cache tables.
							</p>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<AddFeedDialog disabled={!data.isDatabaseConfigured} />
						<Badge
							variant={data.isDatabaseConfigured ? "secondary" : "destructive"}
						>
							<DatabaseIcon />
							{data.isDatabaseConfigured
								? "DATABASE_URL ready"
								: "DATABASE_URL missing"}
						</Badge>
						<Badge variant="outline">{data.feeds.length} feeds</Badge>
						<Badge variant="outline">{data.totalUnread} unread</Badge>
					</div>
				</div>
			</header>

			{!data.isDatabaseConfigured ? (
				<Card>
					<CardContent className="py-8">
						<h2 className="font-semibold text-xl">
							Connect Postgres to start reading
						</h2>
						<p className="mt-2 max-w-2xl text-muted-foreground text-sm">
							Set{" "}
							<code className="rounded bg-secondary px-1.5 py-0.5">
								DATABASE_URL
							</code>
							, run
							<code className="ml-1 rounded bg-secondary px-1.5 py-0.5">
								bun run db:push
							</code>
							, and load Newsboat-compatible rows into{" "}
							<code className="rounded bg-secondary px-1.5 py-0.5">
								interdash_rss_feed
							</code>
							and{" "}
							<code className="rounded bg-secondary px-1.5 py-0.5">
								interdash_rss_item
							</code>
							.
						</p>
					</CardContent>
				</Card>
			) : null}

			<ReaderSearchForm
				defaultQuery={search.q}
				selectedFeedUrl={data.selectedFeedUrl}
			/>

			<section className="grid min-h-[68vh] flex-1 gap-4 lg:grid-cols-[320px_minmax(360px,0.8fr)_minmax(0,1.4fr)]">
				<FeedList
					feeds={data.feeds}
					query={search.q}
					selectedFeedUrl={data.selectedFeedUrl}
					totalUnread={data.totalUnread}
				/>
				<ArticleList
					articles={data.articles}
					query={search.q}
					selectedArticleGuid={data.selectedArticleGuid}
					selectedFeedUrl={data.selectedFeedUrl}
				/>
				<ArticleDetail article={data.selectedArticle} />
			</section>
		</main>
	);
}
