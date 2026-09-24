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
task under `docs/tasks/<spec-slug>/` and that task has a `## Plan` section, this is an
interrupted `/implement`, not a dirty tree.

If the caller is `/implement` on that same task, say so in one line and return:
the command is about to resume it, and the edits are its own work in progress.
Cleaning them would throw away the session you are trying to continue. For any
other caller, tell the user and offer to resume that task instead.

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
  `git add <the exact paths you listed> && git commit -m "<message you propose from the diff>"`
  Never `git add -A`: the agent running the calling command may be allowed to
  commit one folder and not another, and `-A` turns a legitimate commit into a
  refused one.
- **Stash it**, to resume after the command
  `git stash push -u -m "before /<command>"`
- **Ignore it**, for junk only
  `echo "<pattern>" >> .gitignore && git add .gitignore && git commit -m "ignore <pattern>"`
- **Discard it**, only when the user says the changes are worthless
  `git restore . && git clean -fd`
  Say clearly that this is irreversible.
- **Resolve the conflict first**, when the conflict bucket is non-empty.
  No other option is offered until it is done.

**Never offer an option the calling agent cannot execute.** A proposal the
user picks and that then fails on a permission is worse than not offering it:
they made a decision on a menu that was a lie. Which options apply depends on
who called you:

| Caller | Offers | Because |
| --- | --- | --- |
| `/spec`, `/task` | stash, and **Commit it** for paths under `docs/` only | the spec writer's shell is deny-by-default: it can commit documents and stash, nothing else. No ignore, no discard |
| `/drop` | all four | it runs unbound, as one of the privileged steps of the workflow |
| `/implement` | stash, ignore, resolve — **never commit, never discard** | the implementer cannot commit: `/done` owns the commit. It cannot discard either, and does not need to: stash is reversible |

Read the calling agent's own permission block if you are unsure. This table is
written against the three agents shipped with the workflow, and an installation
may have narrowed them further.

**`/done` is not on this list, and must not call you.** It always starts on a
dirty tree: `/implement` never commits, so the work it is about to close *is* the
uncommitted change. Step 1 would classify that as an interrupted `/implement` and
offer to resume it, which is precisely the job `/done` is there to finish. `/done`
handles its own tree instead, by staging the code and the task file and nothing
else.

When the only sensible option is one the caller cannot run — dirty source files
under `/spec`, where the writer can neither commit nor discard them — say so
plainly and offer the stash. The stash is the universal answer: it is the one
action every agent in this workflow is allowed to take, and the only one that
loses nothing.

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
