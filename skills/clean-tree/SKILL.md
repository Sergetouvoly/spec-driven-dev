---
name: clean-tree
description: Use before any command that requires a clean git working tree (spec, task, implement, drop). Diagnoses why the tree is dirty, proposes the exact commands to clean it, runs the user's choice, and resumes the calling command with its original arguments. Never just stop.
---

# clean-tree

A dirty tree is a situation to resolve, not an error. The calling command
keeps its `$ARGUMENTS`; the user retypes nothing.

## 1. Classify

Run `git status --porcelain=v1 -b` and `git rev-parse --abbrev-ref HEAD`.
Clean: say nothing, return to the caller.

Buckets:

| Bucket | Porcelain | Meaning |
| --- | --- | --- |
| staged | `A `, `M `, `D `, `R ` | added, not committed |
| modified | ` M`, ` D` | tracked, not staged |
| untracked | `??` | new files |
| conflict | `UU`, `AA`, `DD` | merge/rebase in progress |

Special case: current branch = the `branch` of a task under
`docs/tasks/<spec-slug>/` that has a `## Plan` → interrupted `/implement`, not
a dirty tree. If the caller is `/implement` on that task, say so in one line
and return (the edits are its work in progress; cleaning would destroy it).
Any other caller: tell the user and offer to resume that task.

## 2. Explain

At most five lines. Per non-empty bucket: count and up to three file names,
then `and N more`, plus the sensible move in plain words. Junk untracked files
(`node_modules`, `dist`, `.env*`, `*.log`, `.DS_Store`, `__pycache__`) get their
own line: they belong in `.gitignore`.

## 3. Propose

Offer only applicable options, each with its exact command:

- **Commit it**: `git add <the exact paths listed> && git commit -m "<message from the diff>"`. Never `git add -A`.
- **Stash it**: `git stash push -u -m "before /<command>"`
- **Ignore it** (junk only): `echo "<pattern>" >> .gitignore && git add .gitignore && git commit -m "ignore <pattern>"`
- **Discard it** (only if the user says it is worthless): `git restore . && git clean -fd`. State that it is irreversible.
- **Resolve the conflict first** when the conflict bucket is non-empty; offer nothing else until done.

**Never offer what the caller cannot execute.**

| Caller | Offers | Because |
| --- | --- | --- |
| `/spec`, `/task` | stash; commit for paths under `docs/` only | shell is deny-by-default: commits docs and stashes only |
| `/drop` | all four | unbound |
| `/implement` | stash, ignore, resolve; **never commit or discard** | `/done` owns the commit; stash is reversible |

If unsure, read the caller's permission block (the table matches the shipped
agents; an install may be narrower). If the only sensible option is one the
caller cannot run, say so and offer the stash.

**`/done` must not call this skill**: it always starts on a dirty tree (the
work to close is uncommitted) and stages code and task file itself.

Ask which option and wait. Do not pick or combine on your own.

## 4. Run and resume

Run exactly the chosen commands, then `git status --porcelain`. Clean: return
to the caller's next step with its original `$ARGUMENTS`. Not clean: go back to
step 1.

If stashed, end the caller's report with `Stashed: <n> files, run git stash pop when done`.

## 5. Abort

If the user aborts or keeps the tree, end with one line:

`Aborted. To retry: /<command> <arguments>`
