---
description: Implement the next task: create its branch, plan it, work it until verify passes
agent: implementer
---

# /implement

Task to implement: $ARGUMENTS

Tasks live in `docs/tasks/<spec-slug>/`; numbering is per spec.

- Task id: that task.
- Spec slug: lowest-numbered file in `docs/tasks/<spec-slug>/`.
- Empty: one folder holds tasks → its lowest-numbered file. Several → list
  each folder with its lowest-numbered task and ask (priority is the user's).

## 1. Preconditions

Follow the `clean-tree` skill, then continue.

Read the task file, `docs/reference/CONTEXT.md` and any ADR named in
`## Notes`. Nothing else, never the spec (denied). If you cannot plan from the
task, name the missing line and STOP: `/task` fixes it.

## 2. Branch

Check `git rev-parse --verify <branch>` (frontmatter).

- Exists: `git switch <branch>`. Read its `## Plan` and `git diff main` (two
  dots: work is uncommitted) and continue from there.
- Missing: `git switch -c <branch> main` (name `main`, do not switch to it).

## 3. Plan

Use `glob`/`grep` scoped to the areas the task names, read only the code it
touches, and write a `## Plan` in the task file: files to change and what
changes in each, in order. Disposable: replace an earlier plan when
restarting.

STOP and show the plan if:
- a criterion is ambiguous and `## Notes` do not settle it
- the plan contradicts an ADR named in `## Notes`
- the plan touches an area the task never mentioned
- the task is obsolete: recommend `/drop`

Otherwise continue without asking.

## 4. Implement

For each `## Done when` criterion: write the named test, watch it fail, make
it pass. `manual` criteria get no test.

Run `verify` and loop until exit 0. Tick a box only when its named test passes;
never tick `manual` (`/done` asks the user).

`verify` still failing after three attempts: STOP, report which criterion and
why. Never loosen a test or reinterpret a criterion.

If the criterion itself is wrong, STOP, say which behavior and why, quoting
the task. Correcting the spec is a `/spec` decision.

## 5. Report

Task: <id> <title>
Branch: <branch>
Verify: <pass or fail> | Manual criteria: <count>
Next: run /done

Do not commit; `/done` owns it.
