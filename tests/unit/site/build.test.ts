import { expect, test } from "bun:test";
import { run } from "@avi2dg/checks/testing/run-effect.ts";
import { brokenLinksOf } from "../../../src/site/links.ts";
import { siteFilesOf } from "../../../src/site/build.ts";

test("every link, anchor and image in the site built from docs leads somewhere, not to a 404", async () => {
  const files = await run(siteFilesOf("."));
  expect(brokenLinksOf(new Map(files.map((file) => [file.path, "body" in file ? file.body : undefined])))).toEqual([]);
});

test("the site holds every article and every interactive diagram the articles link to", async () => {
  const paths = new Set((await run(siteFilesOf("."))).map(({ path }) => path));
  for (const path of ["index.html", "topics/index.html", "blog/overview/index.html", "blog/checks/index.html", "blog/checks.html", "blog/orchestration-orc.html"]) {
    expect(paths).toContain(path);
  }
  expect([...paths].some((path) => path.endsWith(".excalidraw"))).toBe(false);
});
