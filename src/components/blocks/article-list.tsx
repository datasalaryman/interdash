import { Link } from "@tanstack/react-router";
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ArticleDetail, ArticleSummary } from "@/lib/newsboat";
import { cn } from "@/lib/utils";

type ArticleListProps = {
	articles: Array<ArticleSummary>;
	query?: string;
	selectedArticle?: ArticleDetail | null;
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

function formatFullDate(pubDate: number) {
	if (!pubDate) {
		return "No publish date";
	}

	return new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(pubDate * 1000));
}

function ArticleAccordionContent({ article }: { article: ArticleDetail }) {
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant={article.unread ? "default" : "secondary"}>
					{article.unread ? "Unread" : "Read"}
				</Badge>
				{article.flags ? (
					<Badge variant="outline">Flags: {article.flags}</Badge>
				) : null}
				{article.enclosureUrl ? (
					<Badge variant="outline">Enclosure</Badge>
				) : null}
				<span className="text-muted-foreground text-xs">
					{formatFullDate(article.pubDate)}
					{article.author ? ` · ${article.author}` : ""}
				</span>
			</div>

			<div className="flex flex-wrap gap-2">
				{article.url ? (
					<Button asChild size="sm" variant="outline">
						<a href={article.url} rel="noreferrer" target="_blank">
							Open original
							<ExternalLinkIcon />
						</a>
					</Button>
				) : null}
				{article.enclosureUrl ? (
					<Button asChild size="sm" variant="outline">
						<a href={article.enclosureUrl} rel="noreferrer" target="_blank">
							Open enclosure
							<ExternalLinkIcon />
						</a>
					</Button>
				) : null}
			</div>

			<Separator />

			{article.contentText ? (
				<article className="line-clamp-[12] max-w-4xl whitespace-pre-wrap text-pretty text-sm leading-6">
					{article.contentText}
				</article>
			) : (
				<p className="text-muted-foreground text-sm">
					This article has no stored content.
				</p>
			)}
		</div>
	);
}

export function ArticleList({
	articles,
	query,
	selectedArticle,
	selectedArticleGuid,
	selectedFeedUrl,
}: ArticleListProps) {
	return (
		<Card className="min-h-[68vh] overflow-hidden py-0">
			<CardContent className="min-h-0 overflow-auto p-0">
				{articles.length === 0 ? (
					<p className="px-4 py-8 text-muted-foreground text-sm">
						No articles match this view.
					</p>
				) : (
					<div className="grid">
						{articles.map((article, index) => {
							const isSelected = article.guid === selectedArticleGuid;
							const panelId = `article-panel-${index}`;
							const triggerId = `article-trigger-${index}`;
							const expandedArticle =
								isSelected && selectedArticle?.guid === article.guid
									? selectedArticle
									: null;

							return (
								<article key={article.guid}>
									{index > 0 ? <Separator /> : null}
									<Link
										aria-controls={isSelected ? panelId : undefined}
										aria-expanded={isSelected}
										className={cn(
											"block px-4 py-3 transition-colors hover:bg-accent/70",
											isSelected ? "bg-accent" : "",
										)}
										id={triggerId}
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
											<span className="flex shrink-0 items-center gap-2">
												{article.unread ? (
													<Badge className="mt-0.5" variant="default">
														New
													</Badge>
												) : null}
												<ChevronDownIcon
													className={cn(
														"mt-0.5 size-4 text-muted-foreground transition-transform",
														isSelected ? "rotate-180" : "",
													)}
												/>
											</span>
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
									{isSelected ? (
										<section
											aria-labelledby={triggerId}
											className="border-t bg-accent/30 px-4 py-4"
											id={panelId}
										>
											{expandedArticle ? (
												<ArticleAccordionContent article={expandedArticle} />
											) : (
												<p className="text-muted-foreground text-sm">
													Article content is unavailable.
												</p>
											)}
										</section>
									) : null}
								</article>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
