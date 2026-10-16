---
description: Write a reviewed spec for a feature idea, on a clean tree, without touching code
agent: spec-writer
---

# /spec

Feature idea: $ARGUMENTS

Empty: ask for the idea first.

Follow the `specs` skill (gears, interview, template, final check). This file
owns only the mechanics.

## 1. Clean tree

Follow the `clean-tree` skill, then continue.

## 2. Context

Read `docs/reference/CONTEXT.md` and list `docs/reference/adr/` if they exist;
reference them with a one-line pointer, never copy. Never read `docs/archive/`.

## 3. New spec, or next version

List `docs/specs/` first (specs are never archived).

**Exists: evolve it.** No second file, no overwrite. Read it, interview only on
what changes, edit in place per the `specs` skill: numbers stay, ticked
criteria keep tick and task id, a changed behavior is unticked so `/task`
re-picks it, a withdrawn one is struck. Recompute `status` by the `specs`
table (a `done` spec that gained or unticked a criterion → `draft`, or
`active` if its tasks folder holds a task). Report behaviors added, changed,
withdrawn.

**None: create** `docs/specs/<short-name>.md` (lowercase, single hyphens, e.g.
`learner-suspension.md`) with `status: draft`. The slug is permanent (task ids
embed it). No other location is allowed.

## 4. Report and stop

Three lines only:

Spec: <path> <new, or evolved>, status <draft|active|done>
Behaviors: <count> | Uncovered: <count> | Open questions: <count>
Next: review it, then run /task

Do not paste the spec unless asked. Do not code unless the user explicitly
asked to go end to end.
