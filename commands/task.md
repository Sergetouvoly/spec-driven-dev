---
description: Split a reviewed spec into numbered tasks, or open a single ad-hoc task
agent: spec-writer
---

# /task

Input: $ARGUMENTS

- `--adhoc "<description>"`: one task, no spec. Skip to section 4.
- otherwise a spec path or name. Empty: list `docs/specs/` and ask.

## 1. Preconditions

Follow the `clean-tree` skill, then continue.

Must be on `main` (tasks and specs live there only). Otherwise STOP and say so.

Read the spec. Unresolved `[Question]` entries: list them and STOP.

## 2. Split

One task = a coherent, shippable slice an agent finishes unsupervised; if not,
split again.

- Split the **unticked** criteria only. Each appears in the `covers` of at
  least one task. A `~~` struck criterion is withdrawn: skip it.
- A **ticked** criterion is delivered: leave it out of every `covers` and keep
  its tick.
- No behavior in two tasks.
- Order by dependency.
- Aim for 2 to 6 tasks; more than 8 means split the spec.

All criteria ticked: say so and STOP (a change starts at `/spec`).

## 3. Numbering

Scoped to the spec: `<spec-slug>-001`, `-002`. Continue from the highest number
for that slug by globbing file **names** (never content) in
`docs/tasks/<spec-slug>/` and `docs/archive/tasks/<spec-slug>/`. Numbers are
never reused. Ad-hoc: slug and folder `adhoc`.

## 4. Write

One file per task: `docs/tasks/<spec-slug>/<id>-<short-name>.md` (folder = spec
file name without `.md`; ad-hoc in `docs/tasks/adhoc/`).

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
Decisions: <docs/reference/adr/<file>.md — one line on what it settles for this task>
```

Copy criteria verbatim.

**The task must stand alone**: `/implement` cannot read `docs/specs/`, so
transcribe everything the task needs from the spec. Omit `Constraints` and
`Decisions` when nothing binds the task.

Each criterion names its proof: a test run by `verify`, or `manual`. Neither
means rewrite it.

`verify` is the project's test command narrowed to the task (`npm test -- auth`).
With no test runner, first try any command that exits non-zero when the change
is wrong (linter, type check, build, grep script). If none, set `verify: manual`
and report in these words: **this task will close on a human yes, with no exit
code behind it.**

`checks` drives `/done`. Add `e2e` for user-journey criteria. Add `pentest`
when the task opens an endpoint, auth path, upload or external input.

`--adhoc`: no `spec`, no `covers`, one goal, at most two criteria; more means
it needs a spec: say so and STOP. Choose `checks` and say which in the report:
- `[]` when `verify` proves the change and no new surface opens (typo, version
  bump, copy, missing test): the fast lane.
- `[review]` for anything that changes behavior.

Then set the spec's frontmatter to `status: active` (not for ad-hoc).

## 5. Report and stop

Tasks: <count> in docs/tasks/<spec-slug>/
Coverage: <n>/<n> unticked criteria <, <m> already delivered>
Manual criteria: <count>
Next: review them, then run /implement

Regenerate `docs/workflow/status.md` as defined in `/status`, and commit it, the
tasks and the spec status on `main` with `tasks: <spec-slug>`. The commit
precedes the review and the report says so: review the committed files and
edit in place.
