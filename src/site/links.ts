import { targetOf } from "./paths.ts";

export type SiteFiles = ReadonlyMap<string, string | undefined>;

export type BrokenLink = { readonly page: string; readonly href: string; readonly missing: "file" | "anchor" };

type Scan = { readonly hrefs: readonly string[]; readonly anchors: ReadonlySet<string> };

function scanOf(html: string): Scan {
  const hrefs: string[] = [];
  const anchors = new Set<string>();
  new HTMLRewriter()
    .on("[href], [src]", {
      element(element) {
        const href = element.getAttribute("href") ?? element.getAttribute("src");
        if (href !== null) hrefs.push(href);
      },
    })
    .on("[id], a[name]", {
      element(element) {
        const anchor = element.getAttribute("id") ?? element.getAttribute("name");
        if (anchor !== null) anchors.add(anchor);
      },
    })
    .transform(html);
  return { hrefs, anchors };
}

export function brokenLinksOf(files: SiteFiles): readonly BrokenLink[] {
  const scans = new Map<string, Scan>();
  for (const [path, html] of files) if (html !== undefined) scans.set(path, scanOf(html));
  return [...scans].flatMap(([page, { hrefs }]) =>
    hrefs.flatMap((href): readonly BrokenLink[] => {
      const target = targetOf(href, page);
      if (target === undefined) return [];
      if (!files.has(target.path)) return [{ page, href, missing: "file" }];
      const anchors = scans.get(target.path)?.anchors;
      if (target.anchor === "" || anchors === undefined || anchors.has(target.anchor)) return [];
      return [{ page, href, missing: "anchor" }];
    }),
  );
}
