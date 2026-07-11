import {
	ChevronDownIcon,
	CircleCheckIcon,
	CircleXIcon,
	FileUpIcon,
	LoaderCircleIcon,
	PlusIcon,
	SkipForwardIcon,
	XIcon,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { addFeed, importFeedBatch } from "@/server/functions/feeds";

type AddFeedDialogProps = {
	className?: string;
	disabled?: boolean;
};

function errorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return "Unable to add feed.";
}

export function AddFeedDialog({
	className,
	disabled = false,
}: AddFeedDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isBatchOpen, setIsBatchOpen] = useState(false);
	const [rssurl, setRssurl] = useState("");
	const [batchFile, setBatchFile] = useState<File | null>(null);
	const [batchLinkCount, setBatchLinkCount] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [batchResult, setBatchResult] = useState<Awaited<
		ReturnType<typeof importFeedBatch>
	> | null>(null);
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
	const batchDialog =
		isBatchOpen && typeof document !== "undefined"
			? createPortal(
					<div
						aria-labelledby="import-batch-title"
						aria-modal="true"
						className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
						onMouseDown={(event) => {
							if (event.target === event.currentTarget && !isSubmitting)
								closeBatchDialog();
						}}
						role="dialog"
					>
						<form
							className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-2xl"
							onSubmit={handleBatchSubmit}
						>
							<div className="mb-5 flex items-start justify-between gap-4">
								<div>
									<h2 className="font-semibold text-xl" id="import-batch-title">
										Import feed batch
									</h2>
									<p className="mt-1 text-muted-foreground text-sm">
										Choose a file with one feed URL per line. Text after # is
										ignored.
									</p>
								</div>
								<Button
									aria-label="Close import dialog"
									disabled={isSubmitting}
									onClick={closeBatchDialog}
									size="icon"
									type="button"
									variant="ghost"
								>
									<XIcon />
								</Button>
							</div>
							{isSubmitting ? (
								<output className="grid min-h-48 place-items-center rounded-xl border bg-muted/30 p-8 text-center">
									<div>
										<LoaderCircleIcon className="mx-auto size-10 animate-spin text-primary" />
										<p className="mt-4 font-semibold text-lg">
											Importing feeds
										</p>
										<p className="mt-1 text-muted-foreground text-sm">
											Processing {batchLinkCount} link
											{batchLinkCount === 1 ? "" : "s"}. This may take a moment.
										</p>
									</div>
								</output>
							) : batchResult ? (
								<div className="space-y-3 text-sm">
									<div className="grid grid-cols-3 gap-2">
										<div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
											<CircleCheckIcon className="mb-2 size-5" />
											<p className="font-bold text-2xl">
												{batchResult.imported.length}
											</p>
											<p>Imported</p>
										</div>
										<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
											<SkipForwardIcon className="mb-2 size-5" />
											<p className="font-bold text-2xl">
												{batchResult.skipped.length}
											</p>
											<p>Skipped</p>
										</div>
										<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
											<CircleXIcon className="mb-2 size-5" />
											<p className="font-bold text-2xl">
												{batchResult.failed.length}
											</p>
											<p>Errors</p>
										</div>
									</div>
									{batchResult.skipped.length > 0 ? (
										<p className="text-muted-foreground">
											Skipped feeds were already in your library.
										</p>
									) : null}
									{batchResult.failed.length > 0 ? (
										<div className="max-h-48 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3">
											<p className="mb-2 font-medium text-destructive">
												Could not import {batchResult.failed.length}:
											</p>
											{batchResult.failed.map((failure) => (
												<p
													className="break-all text-muted-foreground"
													key={failure.rssurl}
												>
													{failure.rssurl}: {failure.error}
												</p>
											))}
										</div>
									) : null}
								</div>
							) : (
								<Field>
									<FieldLabel htmlFor="feed-batch">Feed list file</FieldLabel>
									<Input
										autoFocus
										disabled={isSubmitting}
										id="feed-batch"
										onChange={(event) =>
											setBatchFile(event.target.files?.[0] ?? null)
										}
										required
										type="file"
									/>
									<FieldDescription>
										Any file extension is accepted.
									</FieldDescription>
									{error ? <FieldError errors={[error]} /> : null}
								</Field>
							)}
							<div className="mt-6 flex justify-end gap-2">
								<Button
									disabled={isSubmitting}
									onClick={
										batchResult?.imported.length
											? () => window.location.assign("/")
											: closeBatchDialog
									}
									type="button"
									variant="outline"
								>
									{batchResult ? "Done" : "Cancel"}
								</Button>
								{!batchResult ? (
									<Button disabled={isSubmitting || !batchFile} type="submit">
										{isSubmitting ? "Importing..." : "Import batch"}
									</Button>
								) : null}
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

	function closeBatchDialog() {
		setIsBatchOpen(false);
		setBatchFile(null);
		setBatchLinkCount(0);
		setBatchResult(null);
		setError(null);
	}

	async function handleBatchSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!batchFile) return;
		setError(null);

		try {
			const text = await batchFile.text();
			setBatchLinkCount(
				new Set(
					text
						.split(/\r?\n/)
						.map((line) => line.split("#", 1)[0]?.trim())
						.filter(Boolean),
				).size,
			);
			setIsSubmitting(true);
			setBatchResult(await importFeedBatch({ data: { text } }));
		} catch (submitError) {
			setError(errorMessage(submitError));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			<div className={className ? `inline-flex ${className}` : "inline-flex"}>
				<Button
					className="flex-1 rounded-r-none"
					disabled={disabled}
					onClick={() => {
						setError(null);
						setIsOpen(true);
					}}
					type="button"
				>
					<PlusIcon /> Add feed
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							aria-label="Add feed options"
							className="rounded-l-none border-l border-primary-foreground/25 px-2"
							disabled={disabled}
							type="button"
						>
							<ChevronDownIcon />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onSelect={() => {
								setError(null);
								setIsOpen(true);
							}}
						>
							<PlusIcon /> Add a single feed
						</DropdownMenuItem>
						<DropdownMenuItem
							onSelect={() => {
								setError(null);
								setIsBatchOpen(true);
							}}
						>
							<FileUpIcon /> Import batch
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			{dialog}
			{batchDialog}
		</>
	);
}
