import { Link } from "@tanstack/react-router";
import { RssIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { FeedSummary } from "@/lib/newsboat";
import { cn } from "@/lib/utils";

type FeedListProps = {
	feeds: Array<FeedSummary>;
	query?: string;
	selectedFeedUrl?: string;
	totalUnread: number;
};

export function FeedList({
	feeds,
	query,
	selectedFeedUrl,
	totalUnread,
}: FeedListProps) {
	return (
		<Card className="min-h-0 overflow-hidden py-0">
			<CardHeader className="border-b px-4 py-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<CardTitle className="flex items-center gap-2 text-base">
							<RssIcon className="size-4 text-primary" />
							Feeds
						</CardTitle>
						<CardDescription>{feeds.length} subscriptions</CardDescription>
					</div>
					<Badge variant={totalUnread > 0 ? "default" : "secondary"}>
						{totalUnread} unread
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="min-h-0 overflow-auto p-2">
				{feeds.length === 0 ? (
					<p className="px-3 py-6 text-muted-foreground text-sm">
						No feeds found yet.
					</p>
				) : (
					<div className="grid gap-1">
						{feeds.map((feed) => {
							const isSelected = feed.rssurl === selectedFeedUrl;

							return (
								<Link
									className={cn(
										"rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent",
										isSelected
											? "bg-accent text-accent-foreground"
											: "text-foreground",
									)}
									key={feed.rssurl}
									search={{ feed: feed.rssurl, q: query || undefined }}
									to="/"
								>
									<span className="flex items-start justify-between gap-3">
										<span className="min-w-0">
											<span className="block truncate font-medium text-sm">
												{feed.title}
											</span>
											<span className="block truncate text-muted-foreground text-xs">
												{feed.rssurl}
											</span>
										</span>
										<span className="flex shrink-0 items-center gap-1">
											<Badge
												variant={feed.unreadCount > 0 ? "default" : "secondary"}
											>
												{feed.unreadCount}
											</Badge>
										</span>
									</span>
								</Link>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
