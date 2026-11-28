import { langOf, REPOSITORY, relativePath, sitePathOf, siteHrefOf } from "./paths.ts";
import { uniqueSlugsOf } from "./slug.ts";

const FRONT_MATTER = /^---\n[\s\S]*?\n---\n/;
const HEADINGS = "h1, h2, h3, h4, h5, h6";
const TAG = /<[^>]*>/g;
const ENTITIES: Readonly<Record<string, string>> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

export type Source = { readonly path: string; readonly markdown: string };

type NavItem = { readonly label: string; readonly path: string };

const NAV: readonly NavItem[] = [
  { label: "Обзор", path: "blog/overview/index.html" },
  { label: "Тезисы", path: "blog/theses/index.html" },
  { label: "Рабочие заметки", path: "topics/index.html" },
];

const STYLE = [
  ":root{--fg:#222;--muted:#6a6a6a;--accent:#e8590c;--link:#1971c2;--line:#e5e5e5;--code:#f4f4f4;--bg:#fff}",
  "*{box-sizing:border-box}",
  "body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.6 system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-text-size-adjust:100%}",
  "header{border-bottom:2px solid #1e1e1e}",
  "nav{max-width:760px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;gap:4px 18px;font-size:16px}",
  "nav a{color:var(--fg);text-decoration:none;padding:4px 0}",
  "nav a:first-child{font-weight:700;margin-right:auto}",
  "nav a:hover,nav a[aria-current=page]{color:var(--accent)}",
  "main{max-width:760px;margin:0 auto;padding:24px 20px 64px;overflow-wrap:break-word}",
  "h1{font-size:32px;line-height:1.2}",
  "h2{font-size:24px;line-height:1.3;margin-top:2em}",
  "h3{font-size:20px;margin-top:1.6em}",
  "a{color:var(--link)}",
  "img{display:block;max-width:100%;height:auto;margin:16px 0}",
  "table{display:block;overflow-x:auto;border-collapse:collapse;font-size:16px}",
  "th,td{border:1px solid var(--line);padding:6px 10px;text-align:left;vertical-align:top}",
  "code{font-size:.88em;background:var(--code);padding:1px 4px;border-radius:4px}",
  "pre{overflow-x:auto;background:var(--code);padding:12px;border-radius:8px}",
  "pre code{padding:0}",
  "em{color:var(--muted)}",
  "blockquote{margin:0;padding-left:16px;border-left:4px solid var(--line);color:var(--muted)}",
].join("");

function textOf(html: string): string {
  return html.replace(TAG, "").replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity] ?? entity);
}

function headingsOf(html: string): readonly string[] {
  const headings: string[] = [];
  let current = "";
  new HTMLRewriter()
    .on(HEADINGS, {
      text(chunk) {
        current += chunk.text;
      },
      element(heading) {
        current = "";
        heading.onEndTag(() => {
          headings.push(current);
        });
      },
    })
    .transform(html);
  return headings;
}

function bodyOf(html: string, source: string, slugs: readonly string[]): string {
  const ids = slugs.values();
  return new HTMLRewriter()
    .on(HEADINGS, {
      element(element) {
        const id = ids.next();
        if (id.done !== true) element.setAttribute("id", id.value);
      },
    })
    .on("a[href]", {
      element(link) {
        link.setAttribute("href", siteHrefOf(link.getAttribute("href") ?? "", source));
      },
    })
    .on("img[src]", {
      element(image) {
        image.setAttribute("src", siteHrefOf(image.getAttribute("src") ?? "", source));
      },
    })
    .transform(html);
}

function navOf(page: string): string {
  const link = ({ label, path }: NavItem): string =>
    `<a href="${relativePath(page, path)}"${path === page ? ' aria-current="page"' : ""}>${label}</a>`;
  const items = [{ label: "Агентная разработка", path: "index.html" }, ...NAV].map(link);
  return `<header><nav aria-label="Разделы" lang="ru">${items.join("")}<a href="${REPOSITORY}">GitHub</a></nav></header>`;
}

export function renderPage({ path, markdown }: Source): string | undefined {
  const page = sitePathOf(path);
  if (page === undefined) return undefined;
  const html = Bun.markdown.html(markdown.replace(FRONT_MATTER, ""));
  const headings = headingsOf(html);
  const title = headings[0] ?? "";
  const body = bodyOf(html, path, uniqueSlugsOf(headings.map(textOf)));
  return [
    "<!doctype html>",
    `<html lang="${langOf(path)}">`,
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${title}</title><style>${STYLE}</style></head>`,
    `<body>${navOf(page)}<main>${body}</main></body>`,
    "</html>",
    "",
  ].join("\n");
}
