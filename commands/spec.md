---
description: Write a reviewed spec for a feature idea, on a clean tree, without touching code
agent: spec-writer
---

# /spec

Feature idea: $ARGUMENTS

If that line is empty, ask for the idea before doing anything else.

Follow the `specs` skill. It owns the gears, the interview, the template and the
final check. This file owns only the mechanics around it.

## 1. Clean tree

Follow the `clean-tree` skill, then continue.

## 2. Context

Read `docs/reference/CONTEXT.md` and list `docs/reference/adr/` if they exist. Reference them from
the spec with a one-line pointer, never copy their content.

Never read `docs/archive/`.

## 3. New spec, or the next version of one

List `docs/specs/` first. A spec for this feature may already exist, delivered or
not: they are never archived, so what is on disk is the whole history of what the
product promises.

**If one exists, evolve it.** Do not open a second file and do not overwrite it.
Read it, run the interview on what is changing only, and edit it in place under
the rules in the `specs` skill: numbers stay, ticked criteria keep their tick and
their task id, a changed behavior is unticked so `/task` picks it up again, a
withdrawn one is struck rather than deleted. Report which behaviors you added,
changed or withdrew.

**If none exists**, save to `docs/specs/<short-name>.md`. Lowercase, single
hyphens, for example `learner-suspension.md`. The slug is permanent: task ids
embed it (`learner-suspension-001`), so renaming the file orphans every task that
ever referred to it.

There is no fallback location. The docs root is decided once, at setup, and
substituted into every command, skill and agent permission. A spec written
outside it is one the spec writer has no permission to create and `/task` would
never find.

## 4. Report and stop

Print three lines and nothing else:

Spec: <path> <new, or evolved>
Behaviors: <count> | Uncovered: <count> | Open questions: <count>
Next: review it, then run /task

Do not paste the spec in chat unless asked. Do not code in this turn unless the
user explicitly asked to go end to end.
