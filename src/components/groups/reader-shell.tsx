import { DatabaseIcon, RadioTowerIcon } from "lucide-react";
import {
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";

import { FeedList } from "@/components/blocks/feed-list";
import { ReaderSearchForm } from "@/components/blocks/reader-search-form";
import { ArticleList } from "@/components/groups/article-list";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ReaderData, ReaderSearch } from "@/lib/newsboat";

type ReaderShellProps = {
	data: ReaderData;
	search: ReaderSearch;
};

const SIDEBAR_DEFAULT_WIDTH = 340;
const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 560;

function clampSidebarWidth(width: number) {
	return Math.min(
		SIDEBAR_MAX_WIDTH,
		Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)),
	);
}

function sidebarWidthFromClientX(
	clientX: number,
	shell: HTMLDivElement | null,
) {
	const shellLeft = shell?.getBoundingClientRect().left ?? 0;

	return clampSidebarWidth(clientX - shellLeft);
}

export function ReaderShell({ data, search }: ReaderShellProps) {
	const shellRef = useRef<HTMLDivElement>(null);
	const isResizingSidebarRef = useRef(false);
	const previousCursorRef = useRef("");
	const previousUserSelectRef = useRef("");
	const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
	const [isResizingSidebar, setIsResizingSidebar] = useState(false);
	const shellStyle = {
		"--sidebar-width": `${sidebarWidth}px`,
	} as CSSProperties;

	function beginSidebarResize(event: ReactPointerEvent<HTMLDivElement>) {
		event.preventDefault();
		isResizingSidebarRef.current = true;
		previousCursorRef.current = document.body.style.cursor;
		previousUserSelectRef.current = document.body.style.userSelect;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
		event.currentTarget.setPointerCapture(event.pointerId);
		setSidebarWidth(sidebarWidthFromClientX(event.clientX, shellRef.current));
		setIsResizingSidebar(true);
	}

	function updateSidebarResize(event: ReactPointerEvent<HTMLDivElement>) {
		if (!isResizingSidebarRef.current) {
			return;
		}

		event.preventDefault();
		setSidebarWidth(sidebarWidthFromClientX(event.clientX, shellRef.current));
	}

	function endSidebarResize(event: ReactPointerEvent<HTMLDivElement>) {
		if (!isResizingSidebarRef.current) {
			return;
		}

		isResizingSidebarRef.current = false;
		document.body.style.cursor = previousCursorRef.current;
		document.body.style.userSelect = previousUserSelectRef.current;
		setIsResizingSidebar(false);

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}

	return (
		<div
			className="min-h-svh lg:grid lg:grid-cols-[var(--sidebar-width)_8px_minmax(0,1fr)]"
			ref={shellRef}
			style={shellStyle}
		>
			<FeedList
				canAddFeed={data.isDatabaseConfigured}
				feeds={data.feeds}
				query={search.q}
				selectedFeedUrl={data.selectedFeedUrl}
				totalUnread={data.totalUnread}
			/>
			<div
				aria-hidden="true"
				className={`hidden w-2 cursor-col-resize touch-none bg-border/40 transition-colors hover:bg-primary/50 lg:block ${
					isResizingSidebar ? "bg-primary/50" : ""
				}`}
				onLostPointerCapture={endSidebarResize}
				onPointerCancel={endSidebarResize}
				onPointerDown={beginSidebarResize}
				onPointerMove={updateSidebarResize}
				onPointerUp={endSidebarResize}
			/>

			<main className="mx-auto flex min-h-svh w-full max-w-[1460px] min-w-0 flex-col gap-4 p-3 md:p-5">
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
							<Badge
								variant={
									data.isDatabaseConfigured ? "secondary" : "destructive"
								}
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

				<section className="min-h-[68vh] flex-1">
					<ArticleList
						articles={data.articles}
						key={`${data.selectedFeedUrl ?? ""}\n${search.q ?? ""}`}
					/>
				</section>
			</main>
		</div>
	);
}
