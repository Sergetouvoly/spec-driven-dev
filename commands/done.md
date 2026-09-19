---
description: Verify the task, merge it, archive it, and refresh the project status
---

# /done

Task to close: $ARGUMENTS

If empty, take the task whose `branch` matches the current git branch.

On `main`, no branch matches, so take instead the task in `docs/tasks/active/`
carrying `merged: true`: its code is in and only the archive is left. That is
where a pull request drops you — you merged it on the host, pulled, and the
branch is gone. If several tasks carry the marker, list them and ask. If none
does, say so: there is nothing here to close, and the id was worth typing.

This command runs in two phases. Phase A verifies and merges. Phase B archives.
If `merged: true` in the frontmatter, the branch is already in, so skip to
phase B.

## A1. Proof, not ticks

Run `verify` from the frontmatter. If it does not exit 0, print the failure and
STOP. Ticked boxes prove nothing: an agent that just wrote the code believes it
works, which is exactly why the gate is the test run and not the checklist.

For each criterion marked `manual`, show it to the user and ask for a yes or no.
A no stops the command.

If `verify: manual`, show every criterion and ask once.

## A2. Checks

Read `checks` in the frontmatter and run each on the diff of this task.

**The diff is `git diff main`, not `git diff main...HEAD`.** `/implement` never
commits, so at this point the branch carries no commit above `main`, and the
three-dot form would hand every check an empty diff — a reviewer that passes
because it was shown nothing at all.

Run `git add -N .` first. `git diff` ignores untracked files, and a source file
the task created but never staged is exactly the kind a review has to see. Then
`git reset` once the checks are done, before you stage anything in A4: an
intent-to-add entry left in the index reaches that commit as an empty file.

Run the checks in this order, stopping at the first that fails.

**An empty `checks` skips this section entirely.** Do not review the diff
anyway, and do not offer to. Someone decided at `/task` time that `verify`
proves this change on its own, before the code existed and with nothing to
defend. You are the session that just wrote it. Print `Checks: none` and go to
A3.

- `review` delegate to the `reviewer` subagent via `task`. It runs read-only,
  in its own context. An agent reviewing its own work in the same session
  confirms its own assumptions, including the wrong ones.
- `e2e` follow the `e2e-tests` skill against the criteria of this task.
- `pentest` follow the `pentest` skill on the surface this task opened.

If a check names a skill or an agent that is not installed, STOP and say which
one. Do not improvise the check from its name: a `pentest` invented on the spot
reports whatever the session happens to think of, and it will be read as if it
had been thorough. Either the skill gets installed, or the check comes out of
the task's `checks`.

**Blocking means one of three things only: incorrect behavior against a
criterion, a security hole, or possible data loss.** Everything else is not
blocking, whatever tone the reviewer used.

Fix blocking findings, then **rerun `verify` from A1 before rerunning the
check**. A fix written here is code nobody tested: the diff that satisfied the
reviewer is not the diff `verify` approved twenty minutes ago, and a fix for a
missing authorization is exactly the kind that breaks an existing test. Merging
on the strength of the first `verify` run would mean the gate stopped applying
the moment the code started changing again.

**Two passes maximum.** If a third
would be needed, stop and hand the remainder to the user. Non-blocking findings
go under `## Follow-up` in the task file, or become an `--adhoc` task if they
need their own branch.

## A3. Spec drift, noted here and written on `main`

A task with no `spec` skips this section: there is no contract behind its
criteria, and the task file is already the record.

Otherwise, if implementation showed a criterion to be wrong, incomplete or
ambiguous, append it to the task file:

```markdown
## Spec drift
<B id>. <what the spec claims> — <what the code showed> — <what the spec should say>
```

**Do not edit the spec here.** You are on the branch, and the spec lives on
`main`. An edit made here is staged by nothing — A4 stages the code and this
task's file, nothing else under `docs/` — so it would ride the working tree
across the switch and the merge, and on the pull request path it would be lost
outright: only what you pushed goes in. Phase B applies it on `main`, where the
spec actually lives, and the note reaches phase B because the task file is
committed in A4.

A spec left lying is worse than no spec: it is what you will read in six months,
and it is now a document that stays in `docs/specs/` for good.

## A4. Commit and merge

Stage the code **and this task's own file**, nothing else under `docs/`. The
pre-commit hook adds `docs/MAP.md` on its own when the file tree changed: it is
derived, and it travels with the commit that changed the tree.

`/implement` wrote `## Plan` into the task file, ticked the boxes it proved, and
A2 may have added `## Follow-up`. None of that is committed yet: `/implement`
does not commit, and this is the commit that owns it. Left out, it survives only
as an uncommitted change riding the working tree across the switch and the
merge — which happens to work for a direct merge and silently loses everything
on a pull request, where only what you pushed goes in.

This does not break the rule that task state lives on `main`. That rule is about
the *archive move*, which changes what other sessions see and still happens on
`main` in B1. The file stays in `active/` here; what enters the branch is the
record of the work the branch did, and it belongs in the same commit as the code
it describes.

One commit:

```
<id> <task title>

Spec: <spec path>
Covers: <B ids>
```

Then merge into `main`:

- direct: `git switch main`, `git merge --no-ff <branch>`, delete the branch,
  set `merged: true`, continue to phase B. The marker is committed in B2, on
  `main`, together with the archive move.
- pull request: set `merged: true` in the task file **before the commit above**,
  so the marker is in the commit and in the push. Then push, open the PR, and
  STOP with `PR open, merge it and run /done <id>`.

  Setting it after the push would leave it as an uncommitted edit that the pull
  request never carries: `main` would come back saying `merged: false`, and the
  second run of `/done` would redo phase A against a branch already merged.

Task state only becomes real on `main`. Archiving on a feature branch leaves
every other session reading a stale `active/`.

## B1. Write the spec, archive the task

You are on `main`. Three things happen here, in this order.

**1. Tick what this task proved.** In the spec's `## Acceptance criteria`, tick
each criterion this task's `covers` names, and put the id after it:

```markdown
- [ ] **B1.** Three failed attempts lock the account for 15 minutes.
- [x] **B1.** Three failed attempts lock the account for 15 minutes. (auth-001)
```

Tick only what `verify` proved or the user confirmed in A1. This is the whole of
the spec-to-task direction, and it is why no index file exists: open the spec and
the criteria tell you which task delivered each behavior, while the unticked ones
are exactly what is left to build. `/task` re-splits from that, and `/status`
counts it. It is written by this command at the one moment it becomes true,
never by hand.

**2. Apply the `## Spec drift` note**, if A3 wrote one: correct the criterion and
record the change in the spec's `Open questions and assumptions`. A corrected
criterion keeps its number. Numbers are never reused and never reassigned:
tasks, tests and commits refer to them.

**3. Move the task file** to `docs/archive/tasks/`.

**The spec is never archived.** It stays in `docs/specs/` after every one of its
tasks is finished, because a delivered feature is the one whose contract you will
need most: to evolve it, to re-split what a `/drop` reopened, and for the
reviewer to check the next task against it. Archiving it would file the contract
in the one folder no agent may read, and the feature could never move again.
Tasks are the work, and work finishes. The spec is the contract, and the contract
holds as long as the feature is in the product.

Nothing in `docs/archive/` is ever read again by an agent. It is a human trail of
the work, not of the contract.

## B2. Changelog, but only when the feature is finished

If this task's spec now has **no unticked criterion left**, the feature is
delivered: follow the `changelog` skill for that spec, once. Otherwise skip this
section and say nothing about it.

A task is not a product change. Twelve tasks can land before a user sees
anything, and a changelog with one line per task is the archive again, in a file
humans were promised they could read. So the unit here is the feature, the
wording comes from the spec's `## Objective` rather than from a commit subject,
and the entry is written at the one moment the feature became true.

An unticked criterion left by `/drop` keeps the feature out of the changelog on
purpose: it carries a `[Question] still wanted?`, and a feature announced while
one of its promises is still undecided is an announcement you will have to take
back.

## B3. Refresh and report

Regenerate `docs/status.md` as defined in `/status`. Commit the archive move, the
spec edits from B1, the changelog entry if there is one, and the status together
on `main` with the message `done: <id>`.

Task <id>: done and merged
Proof: verify exit 0 | confirmed by hand, no exit code
Checks: <list, or none>
Follow-up: <count>
Spec: <n>/<n> criteria ticked <, feature delivered>
Remaining: <count> in docs/tasks/active/
Next: <id> <title>, run /implement

A task closed on `verify: manual` says so on this line, and the same line goes
into the task file before it is archived. Six months later the trail has to
show which tasks were machine-proven and which were vouched for.
