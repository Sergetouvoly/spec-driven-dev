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

## A3. Spec truth

A task with no `spec` skips this section: there is no contract behind its
criteria, and the task file is already the record.

Otherwise, if implementation showed a criterion to be wrong, incomplete or
ambiguous, update the spec now and note the change in its
`Open questions and assumptions`.
A spec that reaches the archive while lying is worse than no spec: it is what
you will read in six months.

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

## B1. Archive

On `main`, move the task file to `docs/archive/tasks/`.

Move its spec to `docs/archive/specs/` too, but only when both hold:

- every task covering that spec now sits in the archive, **and**
- the spec carries no unresolved `[Question]`

A dropped task lands in the archive like a finished one, and `/drop` writes
`[Question] B1 dropped with <id>: still wanted?` into the spec on its way out.
Archiving on the first condition alone would file that question away in the one
folder no agent may read — the behavior would be neither built nor decided, and
nothing would ever surface it again. A spec with an open question stays in
`docs/specs/`, where `/status` keeps reporting it under `Needs a decision`.

Nothing in `docs/archive/` is ever read again by an agent. It is a human trail.

## B2. Refresh and report

Regenerate `docs/status.md` as defined in `/status`. Commit the archive move and
the status together on `main` with the message `done: <id>`.

Task <id>: done and merged
Proof: verify exit 0 | confirmed by hand, no exit code
Checks: <list, or none>
Follow-up: <count>
Remaining: <count> in docs/tasks/active/
Next: <id> <title>, run /implement

A task closed on `verify: manual` says so on this line, and the same line goes
into the task file before it is archived. Six months later the trail has to
show which tasks were machine-proven and which were vouched for.
