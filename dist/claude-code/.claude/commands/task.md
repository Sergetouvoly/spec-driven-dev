---
description: Split a reviewed spec into numbered tasks, or open a single ad-hoc task
---

# /task

Input: $ARGUMENTS

Two modes:

- `--adhoc "<description>"` creates one task with no spec. Skip to section 4.
- anything else is a spec path or name. If empty, list `docs/specs/` and ask.

## 1. Preconditions

Run `git status --porcelain`. If the tree is dirty, tell the user to commit or
stash, and STOP.

You must be on `main`. Tasks and specs live on `main` only, never on a feature
branch: a task file archived on a branch is invisible to every other session
until that branch merges. If the current branch is not `main`, STOP and say so.

Read the spec. If it still has unresolved `[Question]` entries, list them and
STOP. Splitting an undecided spec produces tasks that will be rewritten.

## 2. Split

One task is a coherent, shippable slice that an agent can finish without
supervision. If a task cannot run unsupervised, it is too big: split it again.

Rules:

- Every numbered behavior of the spec appears in the `covers` of at least one task.
- No behavior appears in two tasks.
- Tasks are ordered by dependency: a task never needs a later one to be done.
- Aim for 2 to 6 tasks. More than 8 means the spec itself should be split.

## 3. Numbering

Numbers are scoped to the spec, not global: `<spec-slug>-001`, `<spec-slug>-002`.
Two features split in parallel can never collide, and the task file names its
own spec.

Continue from the highest number carrying that slug, across
`docs/tasks/active/` and `docs/archive/tasks/`. Numbers are never reused.

Ad-hoc tasks use the slug `adhoc`.

## 4. Write

One file per task, at `docs/tasks/active/<id>-<short-name>.md`:

```markdown
---
id: <spec-slug>-<NNN>
spec: docs/specs/<spec-file>.md
covers: [B1, B3]
checks: [review]
verify: <command that exits 0 when the task is done>
branch: kilo/task/<id>-<short-name>
merged: false
---

# <id>. <Task title>

## Goal
One sentence. What works once this task is done.

## Done when
- [ ] **B1.** <criterion, copied verbatim from the spec> → `<test name>`
- [ ] **B3.** <criterion, copied verbatim from the spec> → `manual`

## Notes
Dependencies on other tasks, or anything the implementer must not assume.
```

Copy the criteria word for word. Do not reword them: the spec is the contract.

Each criterion names how it is proven: a test that `verify` runs, or `manual`
when nothing can prove it automatically. A criterion with neither is not a
criterion, rewrite it.

`verify` is the project's test command narrowed to this task, for example
`npm test -- auth`. If the project has no test runner, set `verify: manual` and
say so in the report.

`checks` drives what `/done` runs. Add `e2e` when the criteria describe a user
journey. Add `pentest` when the task opens a new endpoint, an auth path, an
upload, or any external input.

For `--adhoc`: no `spec`, no `covers`, `checks: [review]`, and one goal with at
most two criteria. If it needs more, it deserves a spec: say so and STOP.

## 5. Report and stop

Tasks: <count> in docs/tasks/active/
Coverage: <n>/<n> behaviors
Manual criteria: <count>
Next: review them, then run /next

Then regenerate `docs/status.md` as defined in `/status` and commit both on
`main` with the message `tasks: <spec-slug>`.

## On this target

- Follow the operating rules and restrictions of the `spec-writer` agent, defined in `.claude/agents/spec-writer.md`.
