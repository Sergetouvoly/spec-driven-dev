---
description: Regenerate and show where the project stands, for a fresh session
---

# /status

`docs/workflow/status.md` is derived, never hand-edited. This command rebuilds
it from the filesystem and git. Any command that moves a task runs this
definition.

## 1. Guard

Off `main`, read `main` and write nothing:
- list tasks with `git ls-tree -r --name-only main docs/tasks/` and read each
  with `git show main:<path>` (not `glob`, not the working tree).
- do not overwrite `docs/workflow/status.md`; print the status and say it was
  built from `main` and not saved.

On `main`, read the working tree and write the file.

## 2. Gather

On `main` by `glob`; off `main` by `git ls-tree`/`git show`.

- Tasks in `docs/tasks/*/` (one folder per spec slug, plus `adhoc/`) and their
  frontmatter. A spec has an active task iff its folder holds a file.
- Per task: does its branch exist (`git rev-parse --verify <branch>`), and
  `git rev-list --count main..<branch>` (never `git log`).
- Which carry `merged: true` (code in, archive left).
- `git rev-parse --abbrev-ref HEAD` and `git status --porcelain`.
- Specs in `docs/specs/`: frontmatter `status` and ticked count of
  `## Acceptance criteria`. `~~` struck criteria are withdrawn: excluded from
  ticked, pending and total.

  Recompute each status by the `specs` skill table. Ticks win: if missing or
  wrong, rewrite it (on `main` only) and list as `Status fixed`; off `main`,
  list only. Then:
  - `draft`, no tick: never started → `Needs a decision`.
  - `draft`, some ticks: stalled half-built → `Needs a decision` with criteria
    left.
  - `active`: already under `In progress`/`Next up`.
  - `done`: counters only.
- Specs with an unresolved `[Question]`.

Never read `docs/archive/`; counts come from filenames.

## 3. Write

Overwrite `docs/workflow/status.md` in this shape, under 20 lines:

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

`Started` = active tasks whose branch holds commits. `Next up`: at most three,
the lowest-numbered not-started task of each folder first. Drop empty sections;
never list archived tasks.

## 4. Show

Print the file, then one `Status fixed: <path> <old> -> <new>` line per rewrite.
Nothing else. Fixes are not committed here; the next commit on `main` carries
them.
