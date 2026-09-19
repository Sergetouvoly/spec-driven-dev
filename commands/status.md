---
description: Regenerate and show where the project stands, for a fresh session
---

# /status

`docs/status.md` is derived, never edited by hand. This command rebuilds it from
the filesystem and git, so it cannot drift. Any command that moves a task
regenerates it by running this definition.

## 1. Guard

Everything under `docs/` lives on `main`. A status built on a feature branch
describes one branch, not the project.

So off `main`, this command reads `main` and writes nothing:

- list the tasks with `git ls-tree --name-only main docs/tasks/active/`, and
  read each one with `git show main:<path>`. Not `glob`, not the working tree:
  a feature branch may carry a task file that is not yet on `main`, or an
  edited copy of one that is, and either would make the status describe the
  branch.
- do not overwrite `docs/status.md`. Print the generated status to the user and
  say it was built from `main` and not saved. Writing it here would commit a
  description of the project into a branch that holds one task, and the next
  merge would carry that snapshot onto `main` as if it were current.

On `main`, read the working tree and write the file as described below.

## 2. Gather

On `main`, by `glob`. Off `main`, by `git ls-tree`/`git show` as in section 1 —
same list, different source.

- the tasks in `docs/tasks/active/`, and each frontmatter
- for each, does its branch exist (`git rev-parse --verify <branch>`), and how
  many commits it holds that `main` does not
  (`git rev-list --count main..<branch>`). Not `git log`: the count is all this
  file needs, and `git log -p` prints file contents from any revision, which is
  how an agent denied the archive would read it anyway
- which of them carry `merged: true`: their code is in, only the archive is
  left. A pull request merged on the host leaves exactly this, and nothing else
  would ever mention it again
- `git rev-parse --abbrev-ref HEAD` and `git status --porcelain`

- the specs in `docs/specs/`, and for each, how many of its `## Acceptance
  criteria` are ticked. Specs are never archived, so `docs/specs/` holds every
  feature the product has ever promised, and the ticks are what separate the
  delivered ones from the live work. Three states matter:
  - no tick and no active task: never started. That is a backlog item nobody
    decided on, and it goes under `Needs a decision`.
  - some ticks and no active task: **stalled half-built**, which is the worst
    state a feature can be in and the one nothing else would report. It goes
    under `Needs a decision` with the count of criteria left.
  - every criterion ticked: delivered. It contributes to the counters and is
    named nowhere else, because a finished feature is not current state.
- the specs carrying an unresolved `[Question]`

Never read `docs/archive/`. Counts come from filenames, not content.

## 3. Write

Overwrite `docs/status.md` with exactly this shape. Keep it under 20 lines: it
is read at the start of every session, so every line costs tokens forever.

```markdown
# Status

Updated: <YYYY-MM-DD>

## In progress
<id> <title> on <branch>, <n> commits, verify <pass|fail|not run>
<id> <title> merged, not archived, run /done <id>
<or: nothing, working tree clean>

## Next up
- <id> <title>

## Needs a decision
- <unresolved [Question] in an active task or its spec>
- <spec never started: path>
- <spec stalled: path, <n> criteria left, no active task>

Active: <n> | Started: <n> | Archived: <n> | Features: <n>/<n> delivered
```

`Started` counts active tasks whose branch already holds commits. A task started
and left is the thing a fresh session most needs to see, and the thing it is
most likely to redo from scratch.

List at most three tasks under `Next up`, drop empty sections, and never list
archived tasks: git holds that history.

## 4. Show

Print the file. Nothing else.
