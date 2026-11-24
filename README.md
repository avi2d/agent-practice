# agent-practice

How and why I work with coding agents.
The Russian articles in [`docs/blog/`](docs/blog/README.md) are the text to read, with the sources and evidence limits for each thesis.
Each page under `docs/topics/` takes one topic, such as quality gates, subagents or evals, and holds my English working position on it, which the articles draw on.
A page gives the reasons, links to the file and line that carry the position, and names what did not work.

## Before you begin

- Git.
- Bun, at the version `.bun-version` pins.

## Install

To set up a working copy:

1. Clone the repository:

   ```sh
   git clone https://github.com/avi2d/agent-practice.git
   ```

1. Install the dependencies from the repository root:

   ```sh
   bun install
   ```

## Write a topic page

To add one topic:

1. Copy the topic template, naming the file after the topic:

   ```sh
   cp templates/topic.md docs/topics/quality-gates.md
   ```

1. Fill each part that [The topic pages](docs/topics/README.md) lists.
1. Open a pull request that holds this one page.

## Check a change

To run the checks a pull request runs:

1. Run oxlint and every gate of the checks kit:

   ```sh
   bun run lint
   ```

1. Run the type check:

   ```sh
   bun run typecheck
   ```

A passing lint ends with `checks-lint: <count> gate(s) pass`.

## Where things are

| Path | What it holds |
| --- | --- |
| `VISION.md` | what the pages are for and what they refuse |
| `docs/topics/` | one page per topic |
| [`docs/blog/`](docs/blog/README.md) | Russian articles with sources and evidence limits for each thesis |
| `docs/topics/README.md` | the parts of a topic page and the link forms of a source |
| `templates/topic.md` | the template a topic page starts from |
| `templates/` | the checks kit's templates for every other doc |
| `.github/workflows/` | the CI callers the checks kit writes |

## Related topics

- [The articles](docs/blog/README.md)
- [The topic pages](docs/topics/README.md)
- [The checks kit](https://github.com/avi2d/checks)
