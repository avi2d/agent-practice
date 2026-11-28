export const REPOSITORY = "https://github.com/avi2d/agent-practice";
const SITE = "https://avi2d.github.io/agent-practice/";

const DOCS = "docs/";
const HOME_SOURCE = "docs/blog/README.md";
const SCHEME = /^[a-z][a-z\d+.-]*:/i;
const REPOSITORY_ROOT = "https://repository.invalid/";
const SITE_ROOT = "https://site.invalid/";

export type Lang = "ru" | "en";

export function langOf(source: string): Lang {
  return source.startsWith("docs/topics/") ? "en" : "ru";
}

export function sitePathOf(source: string): string | undefined {
  if (!source.startsWith(DOCS)) return undefined;
  if (source === HOME_SOURCE) return "index.html";
  const inSite = source.slice(DOCS.length);
  if (inSite.endsWith("/README.md") || inSite === "README.md") return inSite.slice(0, -"README.md".length) + "index.html";
  return inSite.endsWith(".md") ? inSite.slice(0, -".md".length) + "/index.html" : inSite;
}

export function collidingPathsOf(paths: readonly string[]): readonly string[] {
  const counts = new Map<string, number>();
  for (const path of paths) counts.set(path, (counts.get(path) ?? 0) + 1);
  return [...counts].flatMap(([path, count]) => (count > 1 ? [path] : []));
}

export function relativePath(from: string, to: string): string {
  const fromDirectories = from.split("/").slice(0, -1);
  const target = to.split("/");
  let shared = 0;
  while (shared < fromDirectories.length && shared < target.length - 1 && fromDirectories[shared] === target[shared]) shared += 1;
  return [...fromDirectories.slice(shared).map(() => ".."), ...target.slice(shared)].join("/");
}

function isOutside(href: string): boolean {
  return SCHEME.test(href) || href.startsWith("//") || href.startsWith("#");
}

export function siteHrefOf(href: string, source: string): string {
  const page = sitePathOf(source);
  if (page === undefined) return href;
  if (href.startsWith(SITE)) return relativePath(page, href.slice(SITE.length) || "index.html");
  if (isOutside(href)) return href;
  const url = new URL(href, REPOSITORY_ROOT + source);
  const target = decodeURIComponent(url.pathname.slice(1));
  const published = sitePathOf(target);
  if (published === undefined) return `${REPOSITORY}/blob/main/${target}${url.hash}`;
  return relativePath(page, published) + url.hash;
}

export type Target = { readonly path: string; readonly anchor: string };

export function targetOf(href: string, page: string): Target | undefined {
  const local = href.startsWith(SITE) ? SITE_ROOT + href.slice(SITE.length) : href;
  if (!local.startsWith(SITE_ROOT) && (SCHEME.test(local) || local.startsWith("//"))) return undefined;
  const url = new URL(local, SITE_ROOT + page);
  const path = decodeURIComponent(url.pathname.slice(1));
  return { path: path === "" || path.endsWith("/") ? path + "index.html" : path, anchor: decodeURIComponent(url.hash.slice(1)) };
}
