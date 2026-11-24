import { expect, test } from "bun:test";
import { countMerges, createSnapshot, formatDay, parseDay, renderSummary, splitPeriod } from "../../src/results.ts";

test("counts a duplicate merge once and never names private or internal projects in either artifact", () => {
  const publicRepo = { id: "one", nameWithOwner: "example/public-tool", visibility: "PUBLIC" } as const;
  const privateRepo = { id: "two", nameWithOwner: "example/company-secret", visibility: "PRIVATE" } as const;
  const internalRepo = { id: "three", nameWithOwner: "example/staff-only", visibility: "INTERNAL" } as const;
  const publicMerge = { id: "pr-1", mergedAt: "2025-01-31T23:59:59Z", repository: publicRepo };
  const { byMonth, projects } = countMerges([
    { id: "pr-4", mergedAt: "2025-02-01T00:00:00Z", repository: internalRepo },
    publicMerge,
    { id: "pr-2", mergedAt: "2025-02-16T00:00:00Z", repository: publicRepo },
    publicMerge,
    { id: "pr-3", mergedAt: "2025-02-28T00:00:00Z", repository: privateRepo },
  ]);

  const workflowRuns = new Map([["one", 4], ["two", 7], ["three", 5]]);
  const from = parseDay("2025-01-01");
  const through = parseDay("2025-02-28");
  if (from === undefined || through === undefined) throw new Error("Fixture period is not a valid date range");
  const snapshot = createSnapshot({
    generatedAt: "2025-03-01T00:00:00Z",
    authors: ["example"],
    period: { from, through },
  }, byMonth, projects.map((project) => {
    const ciRuns = workflowRuns.get(project.repository.id);
    if (ciRuns === undefined) throw new Error("Fixture project is missing a workflow run count");
    return { ...project, ciRuns };
  }));

  expect(snapshot.byMonth).toEqual([
    { month: "2025-01", mergedPullRequests: 1 },
    { month: "2025-02", mergedPullRequests: 3 },
  ]);
  expect(snapshot.totals).toEqual({ projectsSupported: 3, mergedPullRequests: 4, ciRuns: 16 });
  expect(snapshot.publicProjects).toEqual([{ repository: "example/public-tool", mergedPullRequests: 2, ciRuns: 4 }]);
  expect(snapshot.nonPublic).toEqual({ projectsSupported: 2, mergedPullRequests: 2, ciRuns: 12 });
  const summary = renderSummary(snapshot);
  expect(summary).toContain("2025-03-01.json");
  expect(summary).toContain("| Непубличные проекты вместе (2) | 2 | 12 |");
  for (const output of [JSON.stringify(snapshot), summary]) {
    expect(output).toContain(publicRepo.nameWithOwner);
    expect(output).not.toContain(privateRepo.nameWithOwner);
    expect(output).not.toContain(internalRepo.nameWithOwner);
  }
});

test("splits an inclusive UTC period without repeating or skipping a leap day", () => {
  const from = parseDay("2024-02-28");
  const through = parseDay("2024-03-01");
  if (from === undefined || through === undefined) throw new Error("Fixture period is not a valid date range");
  const parts = splitPeriod({ from, through });
  expect(parts?.map((part) => [formatDay(part.from), formatDay(part.through)])).toEqual([
    ["2024-02-28", "2024-02-29"],
    ["2024-03-01", "2024-03-01"],
  ]);
  expect(splitPeriod({ from, through: from })).toBeUndefined();
});
