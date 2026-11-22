---
kind: reference
---
# The topic pages

A topic page under `docs/topics/` is an explanation page that holds one position on running coding agents.

## The parts of a page

| Part | What it holds |
| --- | --- |
| the lead | the position, in one sentence |
| `## Why` | the reasons for the position, each with a link to its source |
| `## Where the setup holds it` | each step of the setup, named by the role it plays, with a link to the file and line that holds it |
| `## What did not work` | each approach tried and abandoned, with the reason it failed |
| `## Related topics` | the other topic pages the position leans on |

`templates/topic.md` holds the same parts, ready to copy.

## Sources

| Source | Link form |
| --- | --- |
| a file and line in a repository | a GitHub permalink at a commit, as in `https://github.com/acme/tools/blob/<commit>/src/run.ts#L12` |
| a change | the pull request or commit URL |
| a community answer | the link the community server returns with the answer |

## Related topics

- [The README](../../README.md)
