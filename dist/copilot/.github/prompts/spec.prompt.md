---
description: Write a reviewed spec for a feature idea, on a clean tree, without touching code
mode: agent
---

# /spec

Feature idea: the text the user typed after the command name

If that line is empty, ask for the idea before doing anything else.

Follow the `specs` skill. It owns the gears, the interview, the template and the
final check. This file owns only the mechanics around it.

## 1. Clean tree

Run `git status --porcelain`. If anything is uncommitted, unstaged or untracked,
tell the user to commit or stash, and STOP.

## 2. Context

Read `docs/CONTEXT.md` and list `docs/adr/` if they exist. Reference them from
the spec with a one-line pointer, never copy their content.

Never read `docs/archive/`.

## 3. Write

Save to `docs/specs/<short-name>.md`, or `specs/<short-name>.md` if there is no
`docs` folder. Lowercase, single hyphens, for example `learner-suspension.md`.

If the file already exists, ask before overwriting.

## 4. Report and stop

Print three lines and nothing else:

Spec: <path>
Behaviors: <count> | Open questions: <count>
Next: review it, then run /task

Do not paste the spec in chat unless asked. Do not code in this turn unless the
user explicitly asked to go end to end.

## On this target

- Before starting, read `.github/agents/spec-writer.md` and follow its rules and restrictions for the whole of this prompt.
