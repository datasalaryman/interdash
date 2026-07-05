import { XMLParser } from "fast-xml-parser";

type XmlRecord = Record<string, unknown>;

export type ParsedRssItem = {
	sourceId: string;
	title: string;
	author: string;
	url: string;
	pubDate: number;
	content: string;
	contentMimeType: string;
	enclosureUrl: string | null;
	enclosureType: string | null;
};

export type ParsedRssFeed = {
	title: string;
	siteUrl: string;
	lastModified: number;
	etag: string;
	items: Array<ParsedRssItem>;
};

const parser = new XMLParser({
	attributeNamePrefix: "@_",
	cdataPropName: "#cdata",
	ignoreAttributes: false,
	parseAttributeValue: false,
	parseTagValue: false,
	removeNSPrefix: true,
	textNodeName: "#text",
});

function isRecord(value: unknown): value is XmlRecord {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function asArray(value: unknown): Array<unknown> {
	if (value === undefined || value === null) {
		return [];
	}

	return Array.isArray(value) ? value : [value];
}

function firstValue(value: unknown) {
	return Array.isArray(value) ? value[0] : value;
}

function textValue(value: unknown): string {
	const first = firstValue(value);

	if (first === undefined || first === null) {
		return "";
	}

	if (["boolean", "number", "string"].includes(typeof first)) {
		return String(first).trim();
	}

	if (!isRecord(first)) {
		return "";
	}

	return (
		textValue(first["#cdata"]) ||
		textValue(first["#text"]) ||
		textValue(first.text)
	);
}

function attrValue(value: unknown, name: string): string {
	const first = firstValue(value);

	if (!isRecord(first)) {
		return "";
	}

	return textValue(first[`@_${name}`]);
}

function childText(record: XmlRecord, key: string): string {
	return textValue(record[key]);
}

function parseDateSeconds(value: string): number {
	if (!value) {
		return 0;
	}

	const time = Date.parse(value);

	return Number.isNaN(time) ? 0 : Math.floor(time / 1000);
}

function mimeTypeForContent(value: unknown, fallback = "text/html") {
	const type = attrValue(value, "type").toLowerCase();

	if (!type) {
		return fallback;
	}

	if (type === "html" || type === "xhtml") {
		return "text/html";
	}

	if (type === "text") {
		return "text/plain";
	}

	return type;
}

function rssLink(value: unknown): string {
	const linkText = textValue(value);

	if (linkText) {
		return linkText;
	}

	return attrValue(value, "href");
}

function atomLink(
	value: unknown,
	preferredRel = "alternate",
	fallbackToFirst = true,
): string {
	const links = asArray(value);
	const preferred = links.find((link) => {
		const rel = attrValue(link, "rel") || "alternate";

		return rel === preferredRel;
	});

	const preferredHref = attrValue(preferred, "href");

	if (preferredHref || !fallbackToFirst) {
		return preferredHref;
	}

	return attrValue(links[0], "href") || textValue(links[0]);
}

function authorValue(value: unknown): string {
	const first = firstValue(value);

	if (!isRecord(first)) {
		return textValue(first);
	}

	return textValue(first.name) || textValue(first.email) || textValue(first);
}

function enclosureValue(value: unknown) {
	const enclosure = firstValue(value);

	return {
		type: attrValue(enclosure, "type") || null,
		url: attrValue(enclosure, "url") || attrValue(enclosure, "href") || null,
	};
}

function parseRssItem(item: unknown, index: number): ParsedRssItem | null {
	if (!isRecord(item)) {
		return null;
	}

	const content =
		childText(item, "encoded") ||
		childText(item, "content") ||
		childText(item, "description") ||
		childText(item, "summary");
	const pubDate = parseDateSeconds(
		childText(item, "pubDate") ||
			childText(item, "published") ||
			childText(item, "updated") ||
			childText(item, "date"),
	);
	const url = rssLink(item.link) || childText(item, "id");
	const title = childText(item, "title");
	const sourceId =
		childText(item, "guid") ||
		childText(item, "id") ||
		url ||
		`${title}:${pubDate}:${index}`;
	const enclosure = enclosureValue(item.enclosure);

	return {
		author: childText(item, "author") || childText(item, "creator"),
		content,
		contentMimeType: content ? "text/html" : "",
		enclosureType: enclosure.type,
		enclosureUrl: enclosure.url,
		pubDate,
		sourceId,
		title,
		url,
	};
}

function parseAtomItem(item: unknown, index: number): ParsedRssItem | null {
	if (!isRecord(item)) {
		return null;
	}

	const contentValue = item.content ?? item.summary;
	const content = textValue(contentValue);
	const pubDate = parseDateSeconds(
		childText(item, "published") || childText(item, "updated"),
	);
	const url = atomLink(item.link);
	const title = childText(item, "title");
	const sourceId =
		childText(item, "id") || url || `${title}:${pubDate}:${index}`;

	return {
		author: authorValue(item.author),
		content,
		contentMimeType: content
			? mimeTypeForContent(contentValue, "text/plain")
			: "",
		enclosureType: null,
		enclosureUrl: atomLink(item.link, "enclosure", false) || null,
		pubDate,
		sourceId,
		title,
		url,
	};
}

function parseRssDocument(document: XmlRecord): ParsedRssFeed | null {
	const rss = firstValue(document.rss);
	const channel = isRecord(rss) ? firstValue(rss.channel) : undefined;

	if (!isRecord(channel)) {
		return null;
	}

	return {
		etag: "",
		items: asArray(channel.item)
			.map(parseRssItem)
			.filter((item) => item !== null),
		lastModified: 0,
		siteUrl: rssLink(channel.link),
		title: childText(channel, "title"),
	};
}

function parseAtomDocument(document: XmlRecord): ParsedRssFeed | null {
	const feed = firstValue(document.feed);

	if (!isRecord(feed)) {
		return null;
	}

	return {
		etag: "",
		items: asArray(feed.entry)
			.map(parseAtomItem)
			.filter((item) => item !== null),
		lastModified: 0,
		siteUrl: atomLink(feed.link),
		title: childText(feed, "title"),
	};
}

function parseRdfDocument(document: XmlRecord): ParsedRssFeed | null {
	const rdf = firstValue(document.RDF);

	if (!isRecord(rdf)) {
		return null;
	}

	const channel = firstValue(rdf.channel);

	return {
		etag: "",
		items: asArray(rdf.item)
			.map(parseRssItem)
			.filter((item) => item !== null),
		lastModified: 0,
		siteUrl: isRecord(channel) ? rssLink(channel.link) : "",
		title: isRecord(channel) ? childText(channel, "title") : "",
	};
}

function parseFeedXml(xml: string): ParsedRssFeed {
	const document = parser.parse(xml);

	if (!isRecord(document)) {
		throw new Error("The URL did not return a valid XML feed.");
	}

	const feed =
		parseRssDocument(document) ||
		parseAtomDocument(document) ||
		parseRdfDocument(document);

	if (!feed) {
		throw new Error("The URL did not return an RSS or Atom feed.");
	}

	return feed;
}

export async function fetchRssFeed(rssurl: string): Promise<ParsedRssFeed> {
	const response = await fetch(rssurl, {
		headers: {
			Accept:
				"application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1",
			"User-Agent": "interdash/rss-fetcher",
		},
	});

	if (!response.ok) {
		throw new Error(`Feed request failed with HTTP ${response.status}.`);
	}

	const xml = await response.text();

	if (!xml.trim()) {
		throw new Error("The feed response was empty.");
	}

	const feed = parseFeedXml(xml);
	const lastModified = parseDateSeconds(
		response.headers.get("last-modified") ?? "",
	);

	return {
		...feed,
		etag: response.headers.get("etag") ?? "",
		lastModified,
	};
}
