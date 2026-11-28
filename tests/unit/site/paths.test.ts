import { expect, test } from "bun:test";
import { collidingPathsOf, langOf, relativePath, siteHrefOf, sitePathOf, targetOf } from "../../../src/site/paths.ts";

test("each source publishes at the address the site plan gives, not at its Markdown name", () => {
  expect(sitePathOf("docs/blog/README.md")).toBe("index.html");
  expect(sitePathOf("docs/blog/quality.md")).toBe("blog/quality/index.html");
  expect(sitePathOf("docs/blog/checks.html")).toBe("blog/checks.html");
  expect(sitePathOf("docs/blog/images/checks-1-passed.svg")).toBe("blog/images/checks-1-passed.svg");
  expect(sitePathOf("docs/topics/README.md")).toBe("topics/index.html");
  expect(sitePathOf("README.md")).toBeUndefined();
});

test("topic pages are English and articles Russian, not one language for both", () => {
  expect(langOf("docs/topics/orchestration.md")).toBe("en");
  expect(langOf("docs/blog/orchestration.md")).toBe("ru");
});

test("a relative path climbs out of the page's folder, not out of the site root", () => {
  expect(relativePath("blog/quality/index.html", "blog/checks.html")).toBe("../checks.html");
  expect(relativePath("index.html", "blog/quality/index.html")).toBe("blog/quality/index.html");
  expect(relativePath("topics/index.html", "index.html")).toBe("../index.html");
});

test("a link to another article keeps its anchor and leads to that article's page", () => {
  expect(siteHrefOf("quality.md#принципы", "docs/blog/checks.md")).toBe("../quality/index.html#%D0%BF%D1%80%D0%B8%D0%BD%D1%86%D0%B8%D0%BF%D1%8B");
  expect(siteHrefOf("../topics/README.md", "docs/blog/README.md")).toBe("topics/index.html");
});

test("a link to a file the site leaves out goes to GitHub, not to a missing page", () => {
  expect(siteHrefOf("../../VISION.md", "docs/blog/README.md")).toBe("https://github.com/avi2d/agent-practice/blob/main/VISION.md");
});

test("a full link to the site becomes relative, so it works before the site is live", () => {
  expect(siteHrefOf("https://avi2d.github.io/agent-practice/blog/checks.html", "docs/blog/checks.md")).toBe("../checks.html");
});

test("outside links and same-page anchors stay as written, not rewritten as files", () => {
  expect(siteHrefOf("https://github.com/avi2d/orc", "docs/blog/orchestration.md")).toBe("https://github.com/avi2d/orc");
  expect(siteHrefOf("#принципы", "docs/blog/orchestration.md")).toBe("#принципы");
  expect(siteHrefOf("mailto:someone@example.com", "docs/blog/orchestration.md")).toBe("mailto:someone@example.com");
});

test("a link's target is the file and anchor it names, and an outside link has none", () => {
  expect(targetOf("../quality/index.html#%D0%BF", "blog/checks/index.html")).toEqual({ path: "blog/quality/index.html", anchor: "п" });
  expect(targetOf("#x", "blog/checks/index.html")).toEqual({ path: "blog/checks/index.html", anchor: "x" });
  expect(targetOf("../", "blog/checks/index.html")).toEqual({ path: "blog/index.html", anchor: "" });
  expect(targetOf("https://github.com/avi2d/orc", "index.html")).toBeUndefined();
});

test("only a path two sources share counts as a collision, not every path", () => {
  expect(collidingPathsOf(["a", "b", "a", "c", "a"])).toEqual(["a"]);
  expect(collidingPathsOf(["a", "b"])).toEqual([]);
});
