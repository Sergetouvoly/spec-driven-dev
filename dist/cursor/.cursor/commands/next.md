---
description: Open the next task, create its branch, plan it, and implement it
---

# /next

Task to open: the text the user typed after the command name

If empty, take the lowest-numbered file in `docs/tasks/active/`.

## 1. Preconditions

Run `git status --porcelain`. If the tree is dirty, STOP and say so.

Read the task file, then its spec if it has one, then `docs/CONTEXT.md` and any
ADR the spec points to. Never read `docs/archive/`.

## 2. Branch

Check `git rev-parse --verify <branch>` from the frontmatter.

- It exists: switch to it. This task was already started. Read its `## Plan`
  and the diff against `main` before writing anything, and continue from there
  rather than restarting.
- It does not exist: `git switch -c <branch>` from `main`.

## 3. Plan

Read the code the task touches, then write a `## Plan` section into the task
file: the files to change and what changes in each, in order.

The plan is written now, against the current code, and is disposable. If an
earlier `## Plan` exists and you are restarting rather than resuming, replace it.

STOP here and show the plan if any of this is true:

- the task needs a decision the spec does not answer
- the plan contradicts an ADR
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

If the code says the criterion itself was wrong, do not silently adapt: STOP,
say which behavior of the spec is wrong and why. Correcting the spec is a
`/spec` decision, not an implementation detail.

## 5. Report

Task: <id> <title>
Branch: <branch>
Verify: <pass or fail> | Manual criteria: <count>
Next: run /done

Do not commit here. `/done` owns the commit.
