---
kind: explanation
---
# Orchestration

Subagents are not needed to protect context from poisoning, but orchestration, the queue that starts and watches each agent run, is needed.

## Why

Current models handle metaprogramming well, so I do not think subagents are needed to protect context from poisoning.
That is my answer from 2026-11-22, and no file in the setup holds it.
Orchestration is a different matter, because a task has to wait until its conditions hold, start on a machine with room, and report what its run did.
The setup's VISION states this aim: a captain directs fleets of agent workers from one place instead of tending each machine, [L3-L4][src1].
The setup pushes the branch and opens the pull request, and the owner merges it unless the project lets the beat merge a green one, [L17-L20][src2].
Only the owner pushes to main or deletes, and a release, a workflow change or a secret change waits for the owner on every project, [L17-L20][src2].

## Where the setup holds it

- **The backlog** keeps one Markdown file per task, on the machine that runs the beat, [L8-L9][src3].
- **A file's folder** is its state, which is `new`, `taken` or `closed`, [L15][src4].
- **The beat** moves a file from `new` to `taken` by rename, so of two beats only one takes a task, [L16][src5].
- **The beat** is one pass that starts every task that can start and closes every task whose run finished, [L8][src6].
- **The beat** has no daemon, and the operating system's scheduler runs it every few minutes, [L9][src7].
- **The start conditions** are five: a priority, no hold or unanswered question, dependencies done, a checkout on a machine with a free slot, and an account with room, [L16-L22][src8].
- **A decision task** never starts, whatever else holds, [L25][src9].
- **The order of starts** puts priority 0 first, and the oldest first within one priority, [L30-L32][src10].
- **The machine** is the one with the most free slots among those that hold the checkout, [L39][src11].
- **A machine above its load limit** takes no new task, [L40][src12].
- **The runner** hands the task to the job queue on its machine, [L9][src13].
- **The job queue's** parallel limit is the machine's slots, so it holds a task back when the machine is full, [L15-L17][src14].
- **A run** is one attempt at one task, from a task file to a pull request or a report, [L8][src15].
- **A run** works in a new branch's worktree, so the agent never touches the owner's checkout, [L15-L16][src16].
- **The watch on the agent** stops a run that prints nothing for 45 minutes with no tool running, [L28][src17].
- **The watch on the agent** tells the owner after 3 failed commands in a row, and pauses and asks after 6, [L29-L30][src18].
- **The agent** can ask the owner a question mid-run through a tool, instead of guessing, [L31][src19].
- **The beat** flags a run whose output has not grown for 30 minutes as stalled, [L52][src20].
- **A ship run** counts as done only with a clean stop, at least one new commit, passing checks and an open pull request, [L35-L40][src21].
- **A stopped ship run** can resume on its branch, [L52][src22].
- **A run** past 300 turns or 5 compactions writes a handover note for the next run on that branch, [L54][src23].
- **The backlog** names why a task waits: no priority, held, parked, depends, decision or room, [L44-L50][src24].

## What did not work

- A sandbox around each agent with a network proxy and an allowlist was the boundary until the owner's decision of 2026-11-26 chose one isolated space, [commit 8c556d3](https://github.com/avi2d/agent-practice/commit/8c556d3d5d5f6ef050866208f31cfd90cba6fbd7).
- The article put the whole agent system in one isolated space, which the article dropped because each agent machine is its own isolated Linux system, [commit 8c556d3](https://github.com/avi2d/agent-practice/commit/8c556d3d5d5f6ef050866208f31cfd90cba6fbd7).
- The topic page called the merge rule a direction, and the Orc scheme showed today's timer and review mode, which the articles dropped because the vision is stated in the present tense and the roadmap belongs on Orc's site, [commit 38b69f8](https://github.com/avi2d/agent-practice/commit/38b69f8f250ea9f7c5e1e1b9257c0f6e729095a9).

## Related topics

- [Orchestration article](../blog/orchestration.md)

[src1]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/VISION.md#L3-L4
[src2]: https://github.com/avi2d/orc/blob/db57734857f7e98d98b9dca6fb5ff3f5bda82fac/VISION.md#L17-L20
[src3]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/backlog.md#L8-L9
[src4]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/backlog.md#L15
[src5]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/backlog.md#L16
[src6]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/beat.md#L8
[src7]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/beat.md#L9
[src8]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/beat.md#L16-L22
[src9]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/beat.md#L25
[src10]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/beat.md#L30-L32
[src11]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/beat.md#L39
[src12]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/beat.md#L40
[src13]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/runner.md#L9
[src14]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/runner.md#L15-L17
[src15]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/run.md#L8
[src16]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/run.md#L15-L16
[src17]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/run.md#L28
[src18]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/run.md#L29-L30
[src19]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/run.md#L31
[src20]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/beat.md#L52
[src21]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/run.md#L35-L40
[src22]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/run.md#L52
[src23]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/run.md#L54
[src24]: https://github.com/avi2d/orc/blob/6b8142d4288f592f0615a14ae286967f12357751/docs/concepts/backlog.md#L44-L50
