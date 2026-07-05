import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { ReaderShell } from "@/components/groups/reader-shell";
import type { ReaderSearch } from "@/lib/newsboat";

function normalizeOptionalString(value: unknown) {
	return typeof value === "string" && value.trim() ? value : undefined;
}

function normalizeSearch(search: Record<string, unknown>): ReaderSearch {
	return {
		feed: normalizeOptionalString(search.feed),
		q: normalizeOptionalString(search.q),
	};
}

const getReaderData = createServerFn({ method: "GET" })
	.validator((search: ReaderSearch) => search)
	.handler(async ({ data }) => {
		const { loadReaderData } = await import("@/lib/newsboat");

		return loadReaderData(data);
	});

export const Route = createFileRoute("/")({
	component: Home,
	loader: ({ deps }) => getReaderData({ data: deps }),
	loaderDeps: ({ search }) => search,
	validateSearch: normalizeSearch,
});

function Home() {
	const data = Route.useLoaderData();
	const search = Route.useSearch();

	return <ReaderShell data={data} search={search} />;
}
