import { ExternalLinkIcon, InboxIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ArticleDetail as ArticleDetailType } from "@/lib/newsboat";

type ArticleDetailProps = {
	article: ArticleDetailType | null;
};

function formatFullDate(pubDate: number) {
	if (!pubDate) {
		return "No publish date";
	}

	return new Intl.DateTimeFormat("en", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(pubDate * 1000));
}

export function ArticleDetail({ article }: ArticleDetailProps) {
	if (!article) {
		return (
			<Card className="min-h-0 items-center justify-center text-center">
				<CardContent className="flex max-w-md flex-col items-center gap-3 py-16">
					<div className="rounded-full bg-secondary p-4 text-secondary-foreground">
						<InboxIcon className="size-7" />
					</div>
					<div>
						<h2 className="font-semibold text-lg">Select an article</h2>
						<p className="text-muted-foreground text-sm">
							Choose an item from the article list to read its stored Newsboat
							content.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="min-h-0 overflow-hidden py-0">
			<CardHeader className="border-b px-6 py-5">
				<div className="mb-3 flex flex-wrap items-center gap-2">
					<Badge variant={article.unread ? "default" : "secondary"}>
						{article.unread ? "Unread" : "Read"}
					</Badge>
					{article.flags ? (
						<Badge variant="outline">Flags: {article.flags}</Badge>
					) : null}
					{article.enclosureUrl ? (
						<Badge variant="outline">Enclosure</Badge>
					) : null}
				</div>
				<CardTitle className="text-pretty text-2xl leading-tight">
					{article.title}
				</CardTitle>
				<CardDescription>
					{article.feedTitle} · {formatFullDate(article.pubDate)}
					{article.author ? ` · ${article.author}` : ""}
				</CardDescription>
			</CardHeader>
			<CardContent className="min-h-0 overflow-auto px-6 py-5">
				<div className="mb-5 flex flex-wrap gap-2">
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
				<Separator className="mb-5" />
				{article.contentText ? (
					<article className="max-w-3xl whitespace-pre-wrap text-pretty text-[15px] leading-7">
						{article.contentText}
					</article>
				) : (
					<p className="text-muted-foreground text-sm">
						This article has no stored content.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
