const namedEntities: Record<string, string> = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	nbsp: " ",
	quot: '"',
};

export function toPlainText(value: string | null | undefined) {
	if (!value) {
		return "";
	}

	return value
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
			if (entity.startsWith("#x")) {
				return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
			}

			if (entity.startsWith("#")) {
				return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
			}

			return namedEntities[entity.toLowerCase()] ?? match;
		})
		.replace(/\s+/g, " ")
		.trim();
}

export function excerpt(value: string | null | undefined, maxLength = 220) {
	const text = toPlainText(value);

	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength - 1).trim()}...`;
}
