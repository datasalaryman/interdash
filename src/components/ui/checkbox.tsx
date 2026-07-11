import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			className={cn(
				"peer size-4 shrink-0 rounded-[4px] border border-input bg-background shadow-xs outline-none transition-shadow data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			data-slot="checkbox"
			{...props}
		>
			<CheckboxPrimitive.Indicator
				className="grid place-content-center text-primary-foreground"
				data-slot="checkbox-indicator"
			>
				{props.checked === "indeterminate" ? (
					<MinusIcon className="size-3.5" />
				) : (
					<CheckIcon className="size-3.5" />
				)}
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
