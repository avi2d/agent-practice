import { Effect, Schema } from "effect";
import { MergedPullRequest, formatDay, parseDay, splitPeriod, type Period } from "./results.ts";

const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));
const decodeMerges = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Struct({
  errors: Schema.optional(Schema.Array(Schema.Unknown)),
  data: Schema.Struct({
    search: Schema.Struct({
      issueCount: Count,
      pageInfo: Schema.Struct({
        hasNextPage: Schema.Boolean,
        endCursor: Schema.NullOr(Schema.NonEmptyString),
      }),
      nodes: Schema.Array(MergedPullRequest),
    }),
  }),
})));

const searchLimit = 1_000;
const mergedPullRequestsQuery = `
query ($query: String!, $cursor: String) {
  search(query: $query, type: ISSUE, first: 100, after: $cursor) {
    issueCount
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        id
        mergedAt
        repository { id nameWithOwner visibility }
      }
    }
  }
}`;

class GitHubError extends Schema.TaggedError<GitHubError>()("GitHubError", {
  message: Schema.String,
}) {}

function formatRange(period: Period) {
  return `${formatDay(period.from)}..${formatDay(period.through)}`;
}

const queryGraphQL = Effect.fnUntraced(function*(body: string) {
  const failure = new GitHubError({ message: "Could not read merged pull requests via gh. Check authentication and permissions, then rerun." });
  const [exitCode, output] = yield* Effect.tryPromise({
    try: (signal) => {
      const child = Bun.spawn(["gh", "api", "graphql", "--hostname", "github.com", "-X", "POST", "--input", "-"], {
        stdin: Buffer.from(body),
        stdout: "pipe",
        stderr: "ignore",
        timeout: 25_000,
        killSignal: "SIGKILL",
        signal,
      });
      return Promise.all([child.exited, new Response(child.stdout).text()]);
    },
    catch: () => failure,
  });
  if (exitCode !== 0) return yield* failure;
  return output;
});

const searchPage = Effect.fnUntraced(function*(author: string, period: Period, cursor: string | null) {
  const raw = yield* queryGraphQL(JSON.stringify({
    query: mergedPullRequestsQuery,
    variables: { query: `is:pr is:merged author:${author} merged:${formatRange(period)} sort:created-asc`, cursor },
  }));
  const result = yield* decodeMerges(raw).pipe(
    Effect.mapError(() => new GitHubError({ message: "GitHub did not return a complete pull request search page." })),
  );
  if (result.errors?.length) {
    return yield* new GitHubError({ message: "GitHub reported an error in a pull request search page." });
  }
  return result.data.search;
});

export const collectMerges = Effect.fnUntraced(function*(
  author: string,
  period: Period,
): Effect.fn.Return<(typeof MergedPullRequest.Type)[], GitHubError> {
  const page = yield* searchPage(author, period, null);
  if (page.issueCount < searchLimit) return yield* collectPages(author, period, page);
  const halves = splitPeriod(period);
  if (halves === undefined) {
    return yield* new GitHubError({ message: "Pull request search reached GitHub's limit in one day. No snapshot was written." });
  }
  const first = yield* collectMerges(author, halves[0]);
  const second = yield* collectMerges(author, halves[1]);
  return [...first, ...second];
});

function inPeriod(pull: typeof MergedPullRequest.Type, period: Period) {
  const day = parseDay(pull.mergedAt.slice(0, 10));
  return day !== undefined && period.from <= day && day <= period.through;
}

const collectPages = Effect.fnUntraced(function*(
  author: string,
  period: Period,
  firstPage: Effect.Success<ReturnType<typeof searchPage>>,
) {
  const expected = firstPage.issueCount;
  let page = firstPage;
  const found = new Map<string, typeof MergedPullRequest.Type>();
  while (page.issueCount === expected) {
    for (const pull of page.nodes) {
      if (!inPeriod(pull, period) || found.has(pull.id)) {
        return yield* new GitHubError({ message: "Pull request search returned a duplicate or a result outside the requested period." });
      }
      found.set(pull.id, pull);
    }
    if (!page.pageInfo.hasNextPage && found.size === expected) return [...found.values()];
    if (page.pageInfo.endCursor === null || page.nodes.length === 0 || !page.pageInfo.hasNextPage || found.size >= expected) break;
    page = yield* searchPage(author, period, page.pageInfo.endCursor);
  }

  return yield* new GitHubError({ message: "Pull request search did not return the reported number of results. Rerun to refresh the search." });
});
