---
name: clean-tree
description: Use before any command that requires a clean git working tree (spec, task, implement, drop). Diagnoses why the tree is dirty, proposes the exact commands to clean it, runs the user's choice, and resumes the calling command with its original arguments. Never just stop.
---

# clean-tree

A dirty tree is a situation to resolve, not an error to report. The calling
command keeps its `$ARGUMENTS` for the whole turn, so the user never retypes
anything.

## 1. Classify

Run `git status --porcelain=v1 -b` and `git rev-parse --abbrev-ref HEAD`.
If the tree is clean, say nothing and return to the caller.

Sort every line into one bucket:

| Bucket | Porcelain code | Meaning |
| --- | --- | --- |
| staged | `A `, `M `, `D `, `R ` | already added, just not committed |
| modified | ` M`, ` D` | tracked files edited, not staged |
| untracked | `??` | new files git does not know |
| conflict | `UU`, `AA`, `DD` | a merge or rebase is in progress |

Then check one special case: if the current branch matches the `branch` of a
task in `docs/tasks/active/` and that task has a `## Plan` section, this is an
interrupted `/implement`, not a dirty tree. Tell the user so, and offer to
resume that task instead of the requested command.

## 2. Explain

Print at most five lines. For each non-empty bucket, one line: the count and
the file names, three at most, then `and N more`. Say what the sensible move
is in plain words, for example "these are your edits from the last session"
or "these look like build output".

Untracked files that match common junk (`node_modules`, `dist`, `.env*`,
`*.log`, `.DS_Store`, `__pycache__`) get their own line: they belong in
`.gitignore`, not in a commit.

## 3. Propose

Offer only the options that apply, each with its exact command:

- **Commit it**
  `git add -A && git commit -m "<message you propose from the diff>"`
- **Stash it**, to resume after the command
  `git stash push -u -m "before /<command>"`
- **Ignore it**, for junk only
  `echo "<pattern>" >> .gitignore && git add .gitignore && git commit -m "ignore <pattern>"`
- **Discard it**, only when the user says the changes are worthless
  `git restore . && git clean -fd`
  Say clearly that this is irreversible.
- **Resolve the conflict first**, when the conflict bucket is non-empty.
  No other option is offered until it is done.

Ask which one. Wait for the answer. Do not pick for the user, and do not
combine options on your own: "commit the tracked, ignore the junk" is a
legitimate answer, but it is theirs to give.

## 4. Run and resume

Run exactly the chosen commands. Run `git status --porcelain` again. If it is
clean, return to the calling command, which continues from its next step with
its original `$ARGUMENTS`. If it is not, go back to step 1: something else was
hiding behind the first fix.

If the user chose to stash, remind them at the end of the calling command's
report, in one line: `Stashed: <n> files, run git stash pop when done`.

## 5. Abort

If the user answers "abort" or asks to keep the tree as is, end the turn with
one line restating the command and arguments they wanted, so it can be pasted
back later:

`Aborted. To retry: /<command> <arguments>`
