---
description: Implement the next task: create its branch, plan it, work it until verify passes
agent: implementer
---

# /implement

Task to implement: $ARGUMENTS

If empty, take the lowest-numbered file in `docs/tasks/active/`.

## 1. Preconditions

Follow the `clean-tree` skill, then continue.

Read, in this order and nothing more:

- the task file
- `docs/CONTEXT.md`
- any ADR the task's `## Notes` points to

Do not read the spec yet. The task carries its criteria word for word, so the
spec is only needed when those criteria are not enough. Never read
`docs/archive/`.

## 2. Branch

Check `git rev-parse --verify <branch>` from the frontmatter.

- It exists: switch to it. This task was already started. Read its `## Plan`
  and the diff against `main` before writing anything, and continue from there
  rather than restarting.
- It does not exist: `git switch -c <branch>` from `main`.

## 3. Plan

Read `docs/MAP.md` if it exists: it is the tracked file tree, and it tells you
where things live before you open anything. Then read only the code the task
touches, and write a `## Plan` section into the task file: the files to change
and what changes in each, in order.

The plan is written now, against the current code, and is disposable. If an
earlier `## Plan` exists and you are restarting rather than resuming, replace it.

Open the spec (`spec` in the frontmatter) only if, while planning, you hit one
of these:

- a criterion is ambiguous on its own
- the task's `## Notes` mention a constraint that lives in the spec
- the plan needs a decision the task does not answer

Read only the sections that concern the `covers` ids, plus the context or
constraints section if there is one.

STOP here and show the plan if any of this is true:

- the spec itself does not answer the decision
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
Spec read: yes | no
Next: run /done

Do not commit here. `/done` owns the commit.
