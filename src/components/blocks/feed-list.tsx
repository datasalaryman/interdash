import { Link, useRouter } from "@tanstack/react-router";
import { RssIcon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { type FormEvent, useState } from "react";

import { AddFeedDialog } from "@/components/blocks/add-feed-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import type { FeedSummary } from "@/lib/newsboat";
import { cn } from "@/lib/utils";
import { deleteFeed } from "@/server/functions/feeds";

type FeedListProps = {
	canAddFeed: boolean;
	feeds: Array<FeedSummary>;
	onManageFeeds: () => void;
	query?: string;
	selectedFeedUrl?: string;
	totalUnread: number;
};

export function FeedList({
	canAddFeed,
	feeds,
	onManageFeeds,
	query,
	selectedFeedUrl,
	totalUnread,
}: FeedListProps) {
	const router = useRouter();
	const [searchDraft, setSearchDraft] = useState("");
	const [feedSearch, setFeedSearch] = useState("");
	const [feedToDelete, setFeedToDelete] = useState<FeedSummary | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const normalizedFeedSearch = feedSearch.toLowerCase();
	const filteredFeeds = normalizedFeedSearch
		? feeds.filter((feed) =>
				[feed.title, feed.rssurl, feed.url].some((value) =>
					value.toLowerCase().includes(normalizedFeedSearch),
				),
			)
		: feeds;

	function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFeedSearch(searchDraft.trim());
	}

	function clearFeedSearch() {
		setSearchDraft("");
		setFeedSearch("");
	}

	async function handleDeleteFeed() {
		if (!feedToDelete || isDeleting) return;

		setIsDeleting(true);
		setDeleteError("");

		try {
			await deleteFeed({ data: { rssurl: feedToDelete.rssurl } });
			const deletedSelectedFeed = feedToDelete.rssurl === selectedFeedUrl;
			setFeedToDelete(null);

			if (deletedSelectedFeed) {
				await router.navigate({
					to: "/",
					search: { q: query || undefined },
					replace: true,
				});
			} else {
				await router.invalidate();
			}
		} catch (error) {
			setDeleteError(
				error instanceof Error ? error.message : "Unable to delete feed.",
			);
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<aside className="flex max-h-[80svh] min-h-[22rem] flex-col overflow-hidden border-b bg-card/90 backdrop-blur lg:sticky lg:top-0 lg:h-svh lg:max-h-svh lg:min-h-svh lg:border-r lg:border-b-0">
			<div className="border-b p-4">
				<AddFeedDialog className="w-full" disabled={!canAddFeed} />
				<form className="mt-3 flex gap-2" onSubmit={handleSearchSubmit}>
					<div className="relative min-w-0 flex-1">
						<SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
						<Input
							aria-label="Filter feeds"
							autoComplete="off"
							className="pl-9"
							onChange={(event) => setSearchDraft(event.target.value)}
							placeholder="Filter feeds"
							value={searchDraft}
						/>
					</div>
					<Button type="submit" variant="outline">
						Search feed
					</Button>
				</form>
				{feedSearch ? (
					<div className="mt-3 flex items-center justify-between gap-3 text-muted-foreground text-xs">
						<span>
							{filteredFeeds.length} of {feeds.length} feeds match
						</span>
						<Button
							onClick={clearFeedSearch}
							size="sm"
							type="button"
							variant="ghost"
						>
							<XIcon />
							Clear
						</Button>
					</div>
				) : null}
			</div>

			<div className="flex items-center justify-between gap-3 border-b px-4 py-3">
				<div>
					<h2 className="flex items-center gap-2 font-semibold text-base leading-none tracking-tight">
						<RssIcon className="size-4 text-primary" />
						Feeds
					</h2>
					<p className="mt-1.5 text-muted-foreground text-sm">
						{feeds.length} subscriptions
					</p>
				</div>
				<div className="flex flex-col items-end gap-2">
					<Button
						onClick={onManageFeeds}
						size="sm"
						type="button"
						variant="outline"
					>
						Manage Feeds
					</Button>
					<Badge variant={totalUnread > 0 ? "default" : "secondary"}>
						{totalUnread} unread
					</Badge>
				</div>
			</div>

			<nav aria-label="Feeds" className="min-h-0 flex-1 overflow-auto p-2">
				{filteredFeeds.length === 0 ? (
					<p className="px-3 py-6 text-muted-foreground text-sm">
						{feeds.length === 0
							? "No feeds found yet."
							: "No feeds match this search."}
					</p>
				) : (
					<div className="grid gap-1">
						{filteredFeeds.map((feed) => {
							const isSelected = feed.rssurl === selectedFeedUrl;

							return (
								<ContextMenu key={feed.rssurl}>
									<ContextMenuTrigger asChild>
										<Link
											className={cn(
												"rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent",
												isSelected
													? "bg-accent text-accent-foreground"
													: "text-foreground",
											)}
											resetScroll={false}
											search={{ feed: feed.rssurl, q: query || undefined }}
											to="/"
										>
											<span className="flex items-start justify-between gap-3">
												<span className="min-w-0">
													<span className="block truncate font-medium text-sm">
														{feed.title}
													</span>
												</span>
												<span className="flex shrink-0 items-center gap-1">
													<Badge
														variant={
															feed.unreadCount > 0 ? "default" : "secondary"
														}
													>
														{feed.unreadCount}
													</Badge>
												</span>
											</span>
										</Link>
									</ContextMenuTrigger>
									<ContextMenuContent>
										<ContextMenuItem
											className="text-destructive focus:text-destructive"
											onSelect={() => {
												setDeleteError("");
												setFeedToDelete(feed);
											}}
										>
											<Trash2Icon />
											Delete feed
										</ContextMenuItem>
									</ContextMenuContent>
								</ContextMenu>
							);
						})}
					</div>
				)}
			</nav>

			<AlertDialog
				onOpenChange={(open) => !open && !isDeleting && setFeedToDelete(null)}
				open={feedToDelete !== null}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete feed?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete {feedToDelete?.title} and all of its
							articles.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deleteError ? (
						<p className="text-destructive text-sm" role="alert">
							{deleteError}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-white hover:bg-destructive/90"
							disabled={isDeleting}
							onClick={(event) => {
								event.preventDefault();
								void handleDeleteFeed();
							}}
						>
							{isDeleting ? "Deleting..." : "Delete feed"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</aside>
	);
}
