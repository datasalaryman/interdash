import { useForm } from "@tanstack/react-form";
import { SearchIcon, XIcon } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({
	q: z.string().max(120, "Search can be at most 120 characters."),
});

type ReaderSearchFormProps = {
	defaultQuery?: string;
	selectedFeedUrl?: string;
};

function navigateToSearch(selectedFeedUrl: string | undefined, q: string) {
	const params = new URLSearchParams();

	if (selectedFeedUrl) {
		params.set("feed", selectedFeedUrl);
	}

	if (q.trim()) {
		params.set("q", q.trim());
	}

	const search = params.toString();
	window.location.assign(search ? `/?${search}` : "/");
}

export function ReaderSearchForm({
	defaultQuery = "",
	selectedFeedUrl,
}: ReaderSearchFormProps) {
	const form = useForm({
		defaultValues: {
			q: defaultQuery,
		},
		validators: {
			onSubmit: searchSchema,
		},
		onSubmit: async ({ value }) => {
			navigateToSearch(selectedFeedUrl, value.q);
		},
	});

	return (
		<form
			className="rounded-xl border bg-card/80 p-3 shadow-sm backdrop-blur"
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<FieldGroup>
				<form.Field name="q">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;

						return (
							<Field>
								<FieldLabel className="sr-only" htmlFor={field.name}>
									Search articles
								</FieldLabel>
								<div className="flex gap-2">
									<div className="relative flex-1">
										<SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
										<Input
											aria-invalid={isInvalid}
											autoComplete="off"
											className="pl-9"
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											placeholder="Search titles and article text"
											value={field.state.value}
										/>
									</div>
									{field.state.value ? (
										<Button
											aria-label="Clear search"
											size="icon"
											type="button"
											variant="outline"
											onClick={() => {
												field.handleChange("");
												navigateToSearch(selectedFeedUrl, "");
											}}
										>
											<XIcon />
										</Button>
									) : null}
									<Button type="submit">Search</Button>
								</div>
								{isInvalid ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						);
					}}
				</form.Field>
			</FieldGroup>
		</form>
	);
}
