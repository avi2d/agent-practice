import { Effect, Schema } from "effect";
import { collectMerges } from "./github.ts";
import { countMerges, createSnapshot, parseDay, renderSummary } from "./results.ts";

const usage = "Usage: bun run results YYYY-MM-DD YYYY-MM-DD AUTHOR [AUTHOR ...]";

class SnapshotError extends Schema.TaggedError<SnapshotError>()("SnapshotError", {
  message: Schema.String,
}) {}

function readScope(args: readonly string[]) {
  const start = args.at(0);
  const end = args.at(1);
  const logins = args.slice(2);
  if (start === undefined || end === undefined || logins.length === 0) return undefined;

  const from = parseDay(start);
  const through = parseDay(end);
  const generatedAt = new Date().toISOString();
  if (from === undefined || through === undefined || from > through || end >= generatedAt.slice(0, 10)) {
    return undefined;
  }

  if (!logins.every((login) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(login) && login.length <= 39)) return undefined;
  const authors = [...new Set(logins.map((login) => login.toLowerCase()))].sort();
  return { generatedAt, authors, period: { from, through } };
}

const snapshot = Effect.fnUntraced(function*(args: readonly string[]) {
  if (args.length === 1 && args[0] === "--help") {
    console.log(usage);
    return;
  }

  const scope = readScope(args);
  if (scope === undefined) {
    return yield* new SnapshotError({ message: `${usage}\nUse a complete period in UTC and at least one GitHub login.` });
  }

  const batches = yield* Effect.forEach(scope.authors, (author) => collectMerges(author, scope.period));
  const result = createSnapshot(scope, countMerges(batches.flat()));
  const base = `data/results/${result.generatedAt.slice(0, 10)}`;
  yield* Effect.tryPromise({
    try: () => Bun.write(`${base}.json`, `${JSON.stringify(result, null, 2)}\n`),
    catch: () => new SnapshotError({ message: "Could not write the JSON snapshot." }),
  });
  yield* Effect.tryPromise({
    try: () => Bun.write(`${base}.md`, renderSummary(result)),
    catch: () => new SnapshotError({ message: "Could not write the Markdown summary." }),
  });
  console.log(`Wrote ${base}.json and ${base}.md`);
});

await Effect.runPromise(snapshot(Bun.argv.slice(2)).pipe(
  Effect.catch((error) => Effect.sync(() => {
    console.error(error.message);
    process.exitCode = 1;
  })),
));
