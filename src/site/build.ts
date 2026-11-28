import { main } from "@avi2dg/checks/core/bun-platform.ts";
import { Console, Effect, FileSystem, Path, Schema } from "effect";
import { brokenLinksOf } from "./links.ts";
import { renderPage } from "./page.ts";
import { collidingPathsOf, sitePathOf } from "./paths.ts";

const SOURCE_DIRECTORIES = ["docs/blog", "docs/topics"] as const;
const OUTPUT = "_site";
const DRAWING_SOURCE = ".excalidraw";

export type SiteFile = { readonly path: string; readonly body: string } | { readonly path: string; readonly copyOf: string };

export class CollidingPaths extends Schema.TaggedError<CollidingPaths>()("CollidingPaths", {
  message: Schema.String,
}) {}

export class BrokenLinks extends Schema.TaggedError<BrokenLinks>()("BrokenLinks", {
  message: Schema.String,
}) {}

const sourcesOf = Effect.fn("sourcesOf")(function* (root: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sources: string[] = [];
  for (const directory of SOURCE_DIRECTORIES) {
    for (const entry of yield* fs.readDirectory(path.join(root, directory), { recursive: true })) {
      const source = `${directory}/${entry}`;
      const info = yield* fs.stat(path.join(root, source));
      if (info.type === "File" && !source.endsWith(DRAWING_SOURCE)) sources.push(source);
    }
  }
  return sources.sort();
});

const siteFileOf = Effect.fn("siteFileOf")(function* (root: string, source: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sitePath = sitePathOf(source);
  if (sitePath === undefined) return [];
  const full = path.join(root, source);
  if (source.endsWith(".md")) {
    const body = renderPage({ path: source, markdown: yield* fs.readFileString(full) });
    return body === undefined ? [] : [{ path: sitePath, body }];
  }
  if (source.endsWith(".html")) return [{ path: sitePath, body: yield* fs.readFileString(full) }];
  return [{ path: sitePath, copyOf: full }];
});

export const siteFilesOf = Effect.fn("siteFilesOf")(function* (root: string) {
  const sources = yield* sourcesOf(root);
  const files: readonly SiteFile[] = (yield* Effect.forEach(sources, (source) => siteFileOf(root, source))).flat();
  const colliding = collidingPathsOf(files.map(({ path }) => path));
  if (colliding.length > 0) return yield* new CollidingPaths({ message: `two sources publish to ${colliding.join(", ")}` });
  return files;
});

const writeSiteFile = Effect.fn("writeSiteFile")(function* (output: string, file: SiteFile) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const target = path.join(output, file.path);
  yield* fs.makeDirectory(path.dirname(target), { recursive: true });
  if ("body" in file) yield* fs.writeFileString(target, file.body);
  else yield* fs.copyFile(file.copyOf, target);
});

export const buildSite = Effect.fn("buildSite")(function* (root: string, output: string) {
  const fs = yield* FileSystem.FileSystem;
  const files = yield* siteFilesOf(root);
  const broken = brokenLinksOf(new Map(files.map((file) => [file.path, "body" in file ? file.body : undefined])));
  if (broken.length > 0) {
    const lines = broken.map(({ page, href, missing }) => `  ${page}: ${href} leads to no ${missing}`);
    return yield* new BrokenLinks({ message: [`${broken.length} link(s) lead nowhere:`, ...lines].join("\n") });
  }
  yield* fs.remove(output, { recursive: true, force: true });
  yield* Effect.forEach(files, (file) => writeSiteFile(output, file), { discard: true });
  return files.length;
});

if (import.meta.main) {
  main(buildSite(".", OUTPUT).pipe(Effect.flatMap((count) => Console.log(`site: wrote ${count} file(s) to ${OUTPUT}/`))));
}
