import { ExternalLinkIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ArticleDetail, ArticleSummary } from "@/lib/newsboat";
import { cn } from "@/lib/utils";
import { getArticleDetail } from "@/server/functions/articles";

type ArticleListProps = {
	articles: Array<ArticleSummary>;
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

function ArticleContent({ article }: { article: ArticleDetail }) {
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

function errorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Unable to load article.";
}

export function ArticleList({ articles }: ArticleListProps) {
	const latestArticleRequestRef = useRef(0);
	const [articleError, setArticleError] = useState<string | null>(null);
	const [isLoadingArticle, setIsLoadingArticle] = useState(false);
	const [selectedArticle, setSelectedArticle] = useState<ArticleDetail | null>(
		null,
	);
	const [selectedArticleGuid, setSelectedArticleGuid] = useState("");

	useEffect(() => {
		return () => {
			latestArticleRequestRef.current += 1;
		};
	}, []);

	function closeArticle() {
		latestArticleRequestRef.current += 1;
		setArticleError(null);
		setIsLoadingArticle(false);
		setSelectedArticle(null);
		setSelectedArticleGuid("");
	}

	async function openArticle(guid: string) {
		const requestId = latestArticleRequestRef.current + 1;
		latestArticleRequestRef.current = requestId;
		setArticleError(null);
		setIsLoadingArticle(true);
		setSelectedArticle(null);
		setSelectedArticleGuid(guid);

		try {
			const articleDetail = await getArticleDetail({ data: { guid } });

			if (latestArticleRequestRef.current !== requestId) {
				return;
			}

			setSelectedArticle(articleDetail);
		} catch (error) {
			if (latestArticleRequestRef.current !== requestId) {
				return;
			}

			setArticleError(errorMessage(error));
		} finally {
			if (latestArticleRequestRef.current === requestId) {
				setIsLoadingArticle(false);
			}
		}
	}

	function handleArticleValueChange(guid: string) {
		if (!guid) {
			closeArticle();
			return;
		}

		void openArticle(guid);
	}

	return (
		<Card className="min-h-[68vh] overflow-hidden py-0">
			<CardContent className="min-h-0 overflow-auto p-0">
				{articles.length === 0 ? (
					<p className="px-4 py-8 text-muted-foreground text-sm">
						No articles match this view.
					</p>
				) : (
					<Accordion
						className="grid"
						collapsible
						onValueChange={handleArticleValueChange}
						type="single"
						value={selectedArticleGuid}
					>
						{articles.map((article) => {
							const isSelected = article.guid === selectedArticleGuid;
							const expandedArticle =
								isSelected && selectedArticle?.guid === article.guid
									? selectedArticle
									: null;

							return (
								<AccordionItem key={article.guid} value={article.guid}>
									<AccordionTrigger
										className={cn(
											"rounded-none px-4 py-3 hover:bg-accent/70 hover:no-underline [&>svg]:mt-0.5",
											isSelected ? "bg-accent" : "",
										)}
									>
										<span className="min-w-0 flex-1">
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
												{formatArticleDate(article.pubDate)} ·{" "}
												{article.feedTitle}
											</span>
											{article.excerpt ? (
												<span className="line-clamp-2 text-muted-foreground text-sm leading-5">
													{article.excerpt}
												</span>
											) : null}
										</span>
									</AccordionTrigger>
									<AccordionContent className="border-t bg-accent/30 px-4 py-4">
										{isLoadingArticle ? (
											<p className="text-muted-foreground text-sm">
												Loading article...
											</p>
										) : articleError ? (
											<p className="text-destructive text-sm">{articleError}</p>
										) : expandedArticle ? (
											<ArticleContent article={expandedArticle} />
										) : (
											<p className="text-muted-foreground text-sm">
												Article content is unavailable.
											</p>
										)}
									</AccordionContent>
								</AccordionItem>
							);
						})}
					</Accordion>
				)}
			</CardContent>
		</Card>
	);
}
