import { expect, test } from "vitest";

import { parseFeedBatch } from "@/lib/newsboat";

test("parseFeedBatch extracts feeds and removes comments", () => {
	expect(
		parseFeedBatch(`
# Feed list
https://example.com/rss.xml # main feed
https://example.org/atom.xml

https://example.com/rss.xml # duplicate
`),
	).toEqual(["https://example.com/rss.xml", "https://example.org/atom.xml"]);
});

test("parseFeedBatch supports CRLF and comments without spaces", () => {
	expect(
		parseFeedBatch("https://example.com/feed#comment\r\n\r\n# ignored"),
	).toEqual(["https://example.com/feed"]);
});
