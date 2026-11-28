import { expect, test } from "bun:test";
import { brokenLinksOf } from "../../../src/site/links.ts";

const files = new Map<string, string | undefined>([
  ["index.html", '<a href="blog/a/index.html#yes">a</a><a href="blog/a/index.html#no">b</a><a href="gone.html">c</a><a href="https://example.com">d</a>'],
  ["blog/a/index.html", '<h2 id="yes">Yes</h2><img src="../images/x.svg"><a href="#yes">top</a>'],
  ["blog/images/x.svg", undefined],
]);

test("a link to a missing file or a missing anchor is broken, and a link to an existing one is not", () => {
  expect(brokenLinksOf(files)).toEqual([
    { page: "index.html", href: "blog/a/index.html#no", missing: "anchor" },
    { page: "index.html", href: "gone.html", missing: "file" },
  ]);
});
