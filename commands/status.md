---
description: Regenerate and show where the project stands, for a fresh session
---

# /status

`docs/status.md` is derived, never edited by hand. This command rebuilds it from
the filesystem and git, so it cannot drift. Any command that moves a task
regenerates it by running this definition.

## 1. Guard

Everything under `docs/` lives on `main`. If the current branch is not `main`,
generate the file from `main` (`git show main:...`) rather than from the working
tree, and say so in the output. A status built on a feature branch describes one
branch, not the project.

## 2. Gather

- `glob docs/tasks/active/*` and read each frontmatter
- for each, does its branch exist, and does it hold commits not in `main`
- `git rev-parse --abbrev-ref HEAD` and `git status --porcelain`
- `glob docs/specs/*` for specs with no task yet, and for specs carrying an
  unresolved `[Question]`

Never read `docs/archive/`. Counts come from filenames, not content.

## 3. Write

Overwrite `docs/status.md` with exactly this shape. Keep it under 20 lines: it
is read at the start of every session, so every line costs tokens forever.

```markdown
# Status

Updated: <YYYY-MM-DD>

## In progress
<id> <title> on <branch>, <n> commits, verify <pass|fail|not run>
<or: nothing, working tree clean>

## Next up
- <id> <title>

## Needs a decision
- <unresolved [Question] in an active task or its spec>
- <spec with no task yet: path>

Active: <n> | Started: <n> | Archived: <n>
```

`Started` counts active tasks whose branch already holds commits. A task started
and left is the thing a fresh session most needs to see, and the thing it is
most likely to redo from scratch.

List at most three tasks under `Next up`, drop empty sections, and never list
archived tasks: git holds that history.

## 4. Show

Print the file. Nothing else.
