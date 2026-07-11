import { useRouter } from "@tanstack/react-router";
import { Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";

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
import { Checkbox } from "@/components/ui/checkbox";
import type { FeedSummary, ReaderSearch } from "@/lib/newsboat";
import { deleteFeeds } from "@/server/functions/feeds";

type FeedManagerProps = {
	feeds: Array<FeedSummary>;
	onClose: () => void;
	search: ReaderSearch;
};

export function FeedManager({ feeds, onClose, search }: FeedManagerProps) {
	const router = useRouter();
	const [selectedUrls, setSelectedUrls] = useState(() => new Set<string>());
	const [isConfirming, setIsConfirming] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const allSelected = feeds.length > 0 && selectedUrls.size === feeds.length;
	const selectedFeeds = feeds.filter((feed) => selectedUrls.has(feed.rssurl));
	const selectedArticleCount = selectedFeeds.reduce(
		(total, feed) => total + feed.articleCount,
		0,
	);

	function setFeedSelected(rssurl: string, selected: boolean) {
		setSelectedUrls((current) => {
			const next = new Set(current);
			selected ? next.add(rssurl) : next.delete(rssurl);
			return next;
		});
	}

	async function handleDeleteFeeds() {
		if (selectedUrls.size === 0 || isDeleting) return;

		setIsDeleting(true);
		setDeleteError("");

		try {
			await deleteFeeds({ data: { feedurls: [...selectedUrls] } });
			setIsConfirming(false);
			setSelectedUrls(new Set());

			if (search.feed && selectedUrls.has(search.feed)) {
				await router.navigate({
					to: "/",
					search: { q: search.q },
					replace: true,
				});
			} else {
				await router.invalidate();
			}
		} catch (error) {
			setDeleteError(
				error instanceof Error ? error.message : "Unable to delete feeds.",
			);
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
			<header className="flex flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
				<div>
					<h2 className="font-semibold text-xl tracking-tight">Manage Feeds</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Select feeds to permanently delete them and their articles.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={onClose} type="button" variant="outline">
						<XIcon />
						Close
					</Button>
					<Button
						disabled={selectedUrls.size === 0}
						onClick={() => {
							setDeleteError("");
							setIsConfirming(true);
						}}
						type="button"
						variant="destructive"
					>
						<Trash2Icon />
						Delete Feeds
					</Button>
				</div>
			</header>

			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead className="border-b bg-muted/40 text-left text-muted-foreground">
						<tr>
							<th className="w-12 px-4 py-3">
								<Checkbox
									aria-label="Select all feeds"
									checked={
										allSelected
											? true
											: selectedUrls.size > 0
												? "indeterminate"
												: false
									}
									onCheckedChange={(checked) =>
										setSelectedUrls(
											checked
												? new Set(feeds.map((feed) => feed.rssurl))
												: new Set(),
										)
									}
								/>
							</th>
							<th className="px-3 py-3 font-medium">Feed</th>
							<th className="px-4 py-3 text-right font-medium">Articles</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{feeds.map((feed) => (
							<tr className="hover:bg-muted/30" key={feed.rssurl}>
								<td className="px-4 py-3">
									<Checkbox
										aria-label={`Select ${feed.title}`}
										checked={selectedUrls.has(feed.rssurl)}
										onCheckedChange={(checked) =>
											setFeedSelected(feed.rssurl, checked === true)
										}
									/>
								</td>
								<td className="min-w-0 px-3 py-3">
									<p className="font-medium">{feed.title}</p>
									<p className="max-w-2xl truncate text-muted-foreground text-xs">
										{feed.rssurl}
									</p>
								</td>
								<td className="px-4 py-3 text-right">
									<Badge variant="secondary">{feed.articleCount}</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{feeds.length === 0 ? (
					<p className="px-6 py-12 text-center text-muted-foreground text-sm">
						No feeds to manage.
					</p>
				) : null}
			</div>

			<AlertDialog
				onOpenChange={(open) => !open && !isDeleting && setIsConfirming(false)}
				open={isConfirming}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete selected feeds?</AlertDialogTitle>
						<AlertDialogDescription>
							You are about to delete {selectedArticleCount} articles and{" "}
							{selectedFeeds.length} feeds.
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
								void handleDeleteFeeds();
							}}
						>
							{isDeleting ? "Deleting..." : "Delete Feeds"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
