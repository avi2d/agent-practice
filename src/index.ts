import { Effect, Schema } from "effect";
import { collectMerges, countWorkflowRuns, type GitHubCli } from "./github.ts";
import { countMerges, createSnapshot, parseDay, renderSummary } from "./results.ts";

const usage = "Usage: bun run results [--gh-axi] YYYY-MM-DD YYYY-MM-DD AUTHOR [AUTHOR ...]";

class SnapshotError extends Schema.TaggedError<SnapshotError>()("SnapshotError", {
  message: Schema.String,
}) {}

function readScope(args: readonly string[]) {
  const cli: GitHubCli = args[0] === "--gh-axi" ? "gh-axi" : "gh";
  const positionals = cli === "gh-axi" ? args.slice(1) : args;
  const start = positionals.at(0);
  const end = positionals.at(1);
  const logins = positionals.slice(2);
  if (start === undefined || end === undefined || logins.length === 0) return undefined;

  const from = parseDay(start);
  const through = parseDay(end);
  const generatedAt = new Date().toISOString();
  if (from === undefined || through === undefined || from > through || end >= generatedAt.slice(0, 10)) {
    return undefined;
  }

  if (!logins.every((login) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(login) && login.length <= 39)) return undefined;
  const authors = [...new Set(logins.map((login) => login.toLowerCase()))].sort();
  return { cli, generatedAt, authors, period: { from, through } };
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

  const batches = yield* Effect.forEach(scope.authors, (author) => collectMerges(scope.cli, author, scope.period));
  const { byMonth, projects } = countMerges(batches.flat());
  const counts = yield* Effect.forEach(projects, (project) =>
    countWorkflowRuns(scope.cli, project.repository.nameWithOwner, scope.period).pipe(
      Effect.map((ciRuns) => ({ ...project, ciRuns })),
    ), { concurrency: 6 });

  const result = createSnapshot(scope, byMonth, counts);
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
