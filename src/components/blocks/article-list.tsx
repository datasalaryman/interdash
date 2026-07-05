import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ArticleSummary } from "@/lib/newsboat";
import { cn } from "@/lib/utils";

type ArticleListProps = {
	articles: Array<ArticleSummary>;
	query?: string;
	selectedArticleGuid?: string;
	selectedFeedUrl?: string;
};

function formatArticleDate(pubDate: number) {
	if (!pubDate) {
		return "No date";
	}

	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(pubDate * 1000));
}

export function ArticleList({
	articles,
	query,
	selectedArticleGuid,
	selectedFeedUrl,
}: ArticleListProps) {
	return (
		<Card className="min-h-0 overflow-hidden py-0">
			<CardHeader className="border-b px-4 py-4">
				<CardTitle className="text-base">Articles</CardTitle>
				<CardDescription>
					{query
						? `${articles.length} matches for "${query}"`
						: `${articles.length} latest items`}
				</CardDescription>
			</CardHeader>
			<CardContent className="min-h-0 overflow-auto p-0">
				{articles.length === 0 ? (
					<p className="px-4 py-8 text-muted-foreground text-sm">
						No articles match this view.
					</p>
				) : (
					<div className="grid">
						{articles.map((article, index) => {
							const isSelected = article.guid === selectedArticleGuid;

							return (
								<div key={article.guid}>
									{index > 0 ? <Separator /> : null}
									<Link
										className={cn(
											"block px-4 py-3 transition-colors hover:bg-accent/70",
											isSelected ? "bg-accent" : "",
										)}
										search={{
											article: article.guid,
											feed: selectedFeedUrl || article.feedurl,
											q: query || undefined,
										}}
										to="/"
									>
										<span className="mb-2 flex items-start justify-between gap-3">
											<span className="font-medium text-sm leading-5">
												{article.title}
											</span>
											{article.unread ? (
												<Badge className="mt-0.5" variant="default">
													New
												</Badge>
											) : null}
										</span>
										<span className="mb-2 block text-muted-foreground text-xs">
											{formatArticleDate(article.pubDate)} · {article.feedTitle}
										</span>
										{article.excerpt ? (
											<span className="line-clamp-2 text-muted-foreground text-sm leading-5">
												{article.excerpt}
											</span>
										) : null}
									</Link>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
