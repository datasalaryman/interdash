import { afterEach, expect, test, vi } from "vitest";

import { fetchRssFeed } from "@/lib/rss";

afterEach(() => {
	vi.unstubAllGlobals();
});

test("fetchRssFeed parses RSS metadata and items", async () => {
	const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
	<channel>
		<title>Example Feed</title>
		<link>https://example.com/</link>
		<item>
			<guid>post-1</guid>
			<title>Hello RSS</title>
			<link>https://example.com/hello</link>
			<dc:creator>Ada</dc:creator>
			<pubDate>Wed, 01 Jan 2025 00:00:00 GMT</pubDate>
			<content:encoded><![CDATA[<p>Hello <strong>world</strong></p>]]></content:encoded>
			<enclosure url="https://example.com/audio.mp3" type="audio/mpeg" />
		</item>
	</channel>
</rss>`;

	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () =>
				new Response(xml, {
					headers: {
						etag: '"abc"',
						"last-modified": "Wed, 01 Jan 2025 00:30:00 GMT",
					},
				}),
		),
	);

	const feed = await fetchRssFeed("https://example.com/feed.xml");

	expect(feed.title).toBe("Example Feed");
	expect(feed.siteUrl).toBe("https://example.com/");
	expect(feed.etag).toBe('"abc"');
	expect(feed.lastModified).toBe(1735691400);
	expect(feed.items).toHaveLength(1);
	expect(feed.items[0]).toMatchObject({
		author: "Ada",
		content: "<p>Hello <strong>world</strong></p>",
		contentMimeType: "text/html",
		enclosureType: "audio/mpeg",
		enclosureUrl: "https://example.com/audio.mp3",
		pubDate: 1735689600,
		sourceId: "post-1",
		title: "Hello RSS",
		url: "https://example.com/hello",
	});
});
