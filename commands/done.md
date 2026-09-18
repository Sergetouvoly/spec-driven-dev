---
description: Verify the task, merge it, archive it, and refresh the project status
---

# /done

Task to close: $ARGUMENTS

If empty, take the task whose `branch` matches the current git branch.

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

Read `checks` in the frontmatter and run each on the branch diff
(`git diff main...HEAD`), in this order, stopping at the first that fails:

- `review` delegate to the `reviewer` subagent via `task`. It runs read-only,
  in its own context. An agent reviewing its own work in the same session
  confirms its own assumptions, including the wrong ones.
- `e2e` follow the `e2e-tests` skill against the criteria of this task.
- `pentest` follow the `pentest` skill on the surface this task opened.

**Blocking means one of three things only: incorrect behavior against a
criterion, a security hole, or possible data loss.** Everything else is not
blocking, whatever tone the reviewer used.

Fix blocking findings, then rerun that check. **Two passes maximum.** If a third
would be needed, stop and hand the remainder to the user. Non-blocking findings
go under `## Follow-up` in the task file, or become an `--adhoc` task if they
need their own branch.

## A3. Spec truth

If implementation showed a criterion to be wrong, incomplete or ambiguous,
update the spec now and note the change in its `Open questions and assumptions`.
A spec that reaches the archive while lying is worse than no spec: it is what
you will read in six months.

## A4. Commit and merge

Stage the code only, not `docs/`. The pre-commit hook adds `docs/MAP.md` on
its own when the file tree changed: it is derived, and it travels with the
commit that changed the tree. One commit:

```
<id> <task title>

Spec: <spec path>
Covers: <B ids>
```

Then merge into `main`:

- direct: `git switch main`, `git merge --no-ff <branch>`, delete the branch,
  set `merged: true`, continue to phase B.
- pull request: push, open the PR, set `merged: true` in the task file on the
  branch, then STOP with `PR open, merge it and run /done again`.

Task state only becomes real on `main`. Archiving on a feature branch leaves
every other session reading a stale `active/`.

## B1. Archive

On `main`, move the task file to `docs/archive/tasks/`.

If it has a spec and every task covering that spec now sits in the archive, move
the spec to `docs/archive/specs/` too.

Nothing in `docs/archive/` is ever read again by an agent. It is a human trail.

## B2. Refresh and report

Regenerate `docs/status.md` as defined in `/status`. Commit the archive move and
the status together on `main` with the message `done: <id>`.

Task <id>: done and merged
Checks: <list>
Follow-up: <count>
Remaining: <count> in docs/tasks/active/
Next: <id> <title>, run /implement
