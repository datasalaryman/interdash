import type * as React from "react";

import { cn } from "@/lib/utils";

function Field({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="field" className={cn("grid gap-2", className)} {...props} />
	);
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field-group"
			className={cn("grid gap-4", className)}
			{...props}
		/>
	);
}

function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: FieldLabel is a primitive; callers provide htmlFor or wrap controls.
		<label
			data-slot="field-label"
			className={cn("font-medium text-sm leading-none", className)}
			{...props}
		/>
	);
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="field-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

function FieldError({
	className,
	errors,
	...props
}: React.ComponentProps<"div"> & {
	errors?: ReadonlyArray<unknown>;
}) {
	if (!errors?.length) {
		return null;
	}

	const message = errors
		.map((error) => {
			if (typeof error === "string") {
				return error;
			}

			if (
				error &&
				typeof error === "object" &&
				"message" in error &&
				typeof error.message === "string"
			) {
				return error.message;
			}

			return undefined;
		})
		.filter(Boolean)
		.join(" ");

	return (
		<div
			data-slot="field-error"
			className={cn("text-destructive text-sm", className)}
			{...props}
		>
			{message}
		</div>
	);
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel };
