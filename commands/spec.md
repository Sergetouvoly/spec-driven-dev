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

Read `docs/CONTEXT.md` and list `docs/adr/` if they exist. Reference them from
the spec with a one-line pointer, never copy their content.

Never read `docs/archive/`.

## 3. Write

Save to `docs/specs/<short-name>.md`. Lowercase, single hyphens, for example
`learner-suspension.md`.

There is no fallback location. The docs root is decided once, at setup, and
substituted into every command, skill and agent permission. A spec written
outside it is one the spec writer has no permission to create and `/task` would
never find.

If the file already exists, ask before overwriting.

## 4. Report and stop

Print three lines and nothing else:

Spec: <path>
Behaviors: <count> | Open questions: <count>
Next: review it, then run /task

Do not paste the spec in chat unless asked. Do not code in this turn unless the
user explicitly asked to go end to end.
