---
description: Implement the next task: create its branch, plan it, work it until verify passes
agent: implementer
---

# /implement

Task to implement: $ARGUMENTS

If empty, take the lowest-numbered file in `docs/tasks/active/`.

## 1. Preconditions

Follow the `clean-tree` skill, then continue.

Read the task file, `docs/CONTEXT.md`, and any ADR named in the task's
`## Notes`. Nothing else, and never the spec: `/task` already copied into the
task everything the spec had to say about it, and `docs/specs/` is denied to
you in read. A task you cannot plan against is a defect in the task. Name the
missing line and STOP: it is fixed in `/task`, not worked around here.

## 2. Branch

Check `git rev-parse --verify <branch>` from the frontmatter.

- It exists: `git switch <branch>`. This task was already started. Read its
  `## Plan` and `git diff main` before writing anything, and continue from
  there rather than restarting. Two dots: you do not commit, so your earlier
  work is in the working tree and not in a commit above `main`.
- It does not exist: `git switch -c <branch> main`. Name `main` as the starting
  point rather than switching to it first: you cannot go there, and you do not
  need to.

## 3. Plan

Find where things live with your own `glob` and `grep`, scoped to the areas the
task names rather than swept across the repository. Then read only the code the
task touches, and write a `## Plan` section into the task file: the files to
change and what changes in each, in order.

Scoped is the point. The task already says which areas it may touch, so a glob
over those is both cheaper and more current than any file tree a repository
could keep for you.

The plan is written now, against the current code, and is disposable. If an
earlier `## Plan` exists and you are restarting rather than resuming, replace it.

STOP here and show the plan if any of this is true:

- a criterion is ambiguous and the task's `## Notes` do not settle it
- the plan contradicts an ADR named in `## Notes`
- the plan touches an area the task never mentioned
- the task turns out to be obsolete: recommend `/drop` instead

Otherwise continue without asking.

## 4. Implement

Work the plan. For each criterion under `## Done when`, write the named test
first, watch it fail, then make it pass. Criteria marked `manual` get no test:
leave them for the user.

Then run `verify` from the frontmatter and loop until it exits 0.

Tick a box only when its named test passes, or, for `manual`, never: `/done`
will ask the user.

If `verify` still fails after three attempts, STOP and report which criterion
and why. Never loosen a test or reinterpret a criterion to make it pass.

If the code says the criterion itself was wrong, do not silently adapt: STOP
and say which behavior is wrong and why, quoting the criterion from the task.
Correcting the spec is a `/spec` decision, not an implementation detail.

## 5. Report

Task: <id> <title>
Branch: <branch>
Verify: <pass or fail> | Manual criteria: <count>
Next: run /done

Do not commit here. `/done` owns the commit.
