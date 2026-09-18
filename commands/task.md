---
description: Split a reviewed spec into numbered tasks, or open a single ad-hoc task
agent: spec-writer
---

# /task

Input: $ARGUMENTS

Two modes:

- `--adhoc "<description>"` creates one task with no spec. Skip to section 4.
- anything else is a spec path or name. If empty, list `docs/specs/` and ask.

## 1. Preconditions

Follow the `clean-tree` skill, then continue.

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

Continue from the highest number carrying that slug. Glob the file names in
`docs/tasks/active/` and `docs/archive/tasks/`, never their content: the
archive is not read, it is listed. Other slugs are ignored. Numbers are never
reused, so a spec split a second time continues where it stopped.

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
branch: <branch-prefix>/<id>-<short-name>
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
Constraints: <each rule from the spec that binds these covers, verbatim>
Decisions: <docs/adr/<file>.md — one line on what it settles for this task>
```

Copy the criteria word for word. Do not reword them: the spec is the contract.

**The task must stand alone.** `/implement` cannot read `docs/specs/`: the
permission is denied, not merely discouraged. You are holding the spec open
right now, for the two to six tasks you are about to write, so transcribe here
everything those tasks will need from it. Whatever you leave behind is lost to
the implementer, and it comes back to you as a blocked task.

That is also why it is cheap: the spec is read once, by you, instead of once per
task by an agent that would have to reread it every time.

Drop the `Constraints` and `Decisions` lines when the spec has nothing that
binds this task. An empty label is noise the implementer still pays for.

Each criterion names how it is proven: a test that `verify` runs, or `manual`
when nothing can prove it automatically. A criterion with neither is not a
criterion, rewrite it.

`verify` is the project's test command narrowed to this task, for example
`npm test -- auth`.

If the project has no test runner, set `verify: manual` and say so in the
report, in those words: **this task will close on a human yes, with no exit code
behind it.** That is the workflow running without its only non-negotiable gate,
and it is worth one more attempt at a real command first — a linter, a type
check, a build, a script that greps for the thing. Anything that exits non-zero
when the change is wrong beats a confirmation, however narrow it is.

`checks` drives what `/done` runs. Add `e2e` when the criteria describe a user
journey. Add `pentest` when the task opens a new endpoint, an auth path, an
upload, or any external input.

For `--adhoc`: no `spec`, no `covers`, and one goal with at most two criteria.
If it needs more, it deserves a spec: say so and STOP.

Choose its `checks` rather than defaulting them, and say which you chose in the
report:

- `checks: []` when `verify` proves the change on its own and the change opens
  no new surface: a typo, a version bump, a copy change, a test that was
  missing. `/done` then runs the test command, merges and archives, and costs
  almost nothing. This is the fast lane, and it is the reason `--adhoc` exists.
- `checks: [review]` for anything that changes behavior, however small.

An empty `checks` is a decision, not a shortcut, and this is where it is taken:
with the change still unwritten, by whoever is scoping it. Taken at `/done`
time it would be taken by the session that just wrote the code, under pressure
to merge, which is the one moment nobody should be trusted with it.

## 5. Report and stop

Tasks: <count> in docs/tasks/active/
Coverage: <n>/<n> behaviors
Manual criteria: <count>
Next: review them, then run /implement

Then regenerate `docs/status.md` as defined in `/status` and commit both on
`main` with the message `tasks: <spec-slug>`.

The commit comes before your review, not after, and the report says so: the
tasks are on `main` so that any session can see them, which is the workflow's
own rule. Review them as committed files and edit them in place — a bad split
is a commit to amend, not work to redo. Nothing reads them until `/implement`.
