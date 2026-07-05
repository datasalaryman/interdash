import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { addFeed } from "@/server/functions/feeds";

type AddFeedDialogProps = {
	disabled?: boolean;
};

function errorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Unable to add feed.";
}

export function AddFeedDialog({ disabled = false }: AddFeedDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [rssurl, setRssurl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const dialog =
		isOpen && typeof document !== "undefined"
			? createPortal(
					<div
						aria-labelledby="add-feed-title"
						aria-modal="true"
						className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
						onMouseDown={(event) => {
							if (event.target === event.currentTarget && !isSubmitting) {
								setIsOpen(false);
							}
						}}
						role="dialog"
					>
						<form
							className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-2xl"
							onSubmit={handleSubmit}
						>
							<div className="mb-5 flex items-start justify-between gap-4">
								<div>
									<h2 className="font-semibold text-xl" id="add-feed-title">
										Add RSS feed
									</h2>
									<p className="mt-1 text-muted-foreground text-sm">
										Paste an RSS or Atom link. Interdash will save it and fetch
										the latest items now.
									</p>
								</div>
								<Button
									aria-label="Close add feed dialog"
									disabled={isSubmitting}
									onClick={() => setIsOpen(false)}
									size="icon"
									type="button"
									variant="ghost"
								>
									<XIcon />
								</Button>
							</div>
							<Field>
								<FieldLabel htmlFor="rssurl">Feed URL</FieldLabel>
								<Input
									autoFocus
									disabled={isSubmitting}
									id="rssurl"
									onChange={(event) => setRssurl(event.target.value)}
									placeholder="https://example.com/feed.xml"
									required
									type="url"
									value={rssurl}
								/>
								<FieldDescription>
									The URL must return RSS, Atom, or RDF XML.
								</FieldDescription>
								{error ? <FieldError errors={[error]} /> : null}
							</Field>
							<div className="mt-6 flex justify-end gap-2">
								<Button
									disabled={isSubmitting}
									onClick={() => setIsOpen(false)}
									type="button"
									variant="outline"
								>
									Cancel
								</Button>
								<Button disabled={isSubmitting} type="submit">
									{isSubmitting ? "Fetching..." : "Add feed"}
								</Button>
							</div>
						</form>
					</div>,
					document.body,
				)
			: null;

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);

		try {
			const result = await addFeed({ data: { rssurl } });
			const params = new URLSearchParams({ feed: result.feed.rssurl });

			window.location.assign(`/?${params.toString()}`);
		} catch (submitError) {
			setError(errorMessage(submitError));
			setIsSubmitting(false);
		}
	}

	return (
		<>
			<Button
				disabled={disabled}
				onClick={() => {
					setError(null);
					setIsOpen(true);
				}}
				type="button"
			>
				<PlusIcon />
				Add feed
			</Button>
			{dialog}
		</>
	);
}
