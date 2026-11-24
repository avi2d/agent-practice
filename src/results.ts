import { Schema } from "effect";

const Repository = Schema.Struct({
  id: Schema.NonEmptyString,
  nameWithOwner: Schema.String.check(Schema.isPattern(/^[\w.-]+\/[\w.-]+$/)),
  visibility: Schema.Literals(["PUBLIC", "PRIVATE", "INTERNAL"]),
});

export const MergedPullRequest = Schema.Struct({
  id: Schema.NonEmptyString,
  mergedAt: Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}T.*Z$/)),
  repository: Repository,
});

const dayMs = 86_400_000;

export function parseDay(value: string): number | undefined {
  const ms = Date.parse(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(ms) || formatDay(ms / dayMs) !== value) {
    return undefined;
  }
  return ms / dayMs;
}

export function formatDay(day: number): string {
  return new Date(day * dayMs).toISOString().slice(0, 10);
}

export type Period = { from: number; through: number };

export function splitPeriod({ from, through }: Period): [Period, Period] | undefined {
  if (from === through) return undefined;
  const midpoint = Math.floor((from + through) / 2);
  return [{ from, through: midpoint }, { from: midpoint + 1, through }];
}

type MonthCount = { month: string; mergedPullRequests: number };
type ProjectMerges = { repository: typeof Repository.Type; mergedPullRequests: number };
type MergeCounts = { byMonth: MonthCount[]; projects: ProjectMerges[] };

export function countMerges(pullRequests: readonly (typeof MergedPullRequest.Type)[]): MergeCounts {
  const seen = new Set<string>();
  const months = new Map<string, number>();
  const projects = new Map<string, ProjectMerges>();

  for (const { id, mergedAt, repository } of pullRequests) {
    const existing = projects.get(repository.id);
    if (existing !== undefined && repository.visibility !== "PUBLIC") existing.repository = repository;
    if (seen.has(id)) continue;
    seen.add(id);
    const month = mergedAt.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
    const project = existing ?? { repository, mergedPullRequests: 0 };
    project.mergedPullRequests++;
    projects.set(repository.id, project);
  }

  const byMonth = [...months].sort(([a], [b]) => a.localeCompare(b))
    .map(([month, mergedPullRequests]) => ({ month, mergedPullRequests }));

  return { byMonth, projects: [...projects.values()] };
}

type Counts = { mergedPullRequests: number; ciRuns: number };
type Totals = Counts & { projectsSupported: number };
type Snapshot = {
  schemaVersion: 1;
  generatedAt: string;
  authors: readonly string[];
  period: { from: string; through: string };
  totals: Totals;
  byMonth: readonly MonthCount[];
  publicProjects: (Counts & { repository: string })[];
  nonPublic: Totals;
};

export function createSnapshot(
  scope: Pick<Snapshot, "generatedAt" | "authors"> & { period: Period },
  byMonth: Snapshot["byMonth"],
  projects: readonly (ProjectMerges & { ciRuns: number })[],
): Snapshot {
  const totals = { projectsSupported: projects.length, mergedPullRequests: 0, ciRuns: 0 };
  const nonPublic = { projectsSupported: 0, mergedPullRequests: 0, ciRuns: 0 };
  const publicProjects: Snapshot["publicProjects"] = [];
  for (const { repository, mergedPullRequests, ciRuns } of projects) {
    totals.mergedPullRequests += mergedPullRequests;
    totals.ciRuns += ciRuns;
    if (repository.visibility === "PUBLIC") {
      publicProjects.push({ repository: repository.nameWithOwner, mergedPullRequests, ciRuns });
    } else {
      nonPublic.projectsSupported++;
      nonPublic.mergedPullRequests += mergedPullRequests;
      nonPublic.ciRuns += ciRuns;
    }
  }
  publicProjects.sort((a, b) => a.repository.localeCompare(b.repository));

  return {
    schemaVersion: 1,
    generatedAt: scope.generatedAt,
    authors: scope.authors,
    period: { from: formatDay(scope.period.from), through: formatDay(scope.period.through) },
    totals,
    byMonth,
    publicProjects,
    nonPublic,
  };
}

export function renderSummary(snapshot: Snapshot): string {
  const { generatedAt, period, totals, nonPublic, publicProjects } = snapshot;

  return [
    `# Результаты на ${generatedAt.slice(0, 10)}`,
    "",
    `Период: с ${period.from} по ${period.through} включительно, по UTC.`,
    "",
    `- Влитые запросы на изменение: ${totals.mergedPullRequests}.`,
    `- Проекты хотя бы с одним таким запросом: ${totals.projectsSupported}.`,
    `- Запуски GitHub Actions в этих проектах: ${totals.ciRuns}.`,
    "",
    "В число запусков входят все процессы GitHub Actions за период, независимо от автора или результата запуска.",
    "Сводка охватывает только репозитории, доступные при сборе данных.",
    "",
    "## По проектам",
    "",
    "| Проект | Влитые запросы | Запуски GitHub Actions |",
    "| --- | ---: | ---: |",
    ...publicProjects.map(({ repository, mergedPullRequests, ciRuns }) =>
      `| [${repository}](https://github.com/${repository}) | ${mergedPullRequests} | ${ciRuns} |`),
    `| Непубличные проекты вместе (${nonPublic.projectsSupported}) | ${nonPublic.mergedPullRequests} | ${nonPublic.ciRuns} |`,
    "",
    `[Данные и разбивка по месяцам](${generatedAt.slice(0, 10)}.json)`,
    "",
  ].join("\n");
}
