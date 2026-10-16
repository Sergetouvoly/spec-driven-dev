---
description: Verify the task, merge it, archive it, and refresh the project status
---

# /done

Task to close: $ARGUMENTS

If empty, take the task whose `branch` matches the current git branch.

On `main`, take instead the task under `docs/tasks/*/` with `merged: true`
(code in, archive left; typical after a PR merged on the host). Several: list
and ask. None: say there is nothing to close.

Phase A verifies and merges. Phase B writes the spec, archives, records. If
`merged: true`, skip to phase B.

## A1. Proof

Run `verify` from the frontmatter. Non-zero exit: print the failure and STOP.
Ticks prove nothing; the test run is the gate.

Show each `manual` criterion to the user for yes/no; a no stops. If
`verify: manual`, show every criterion and ask once.

## A2. Checks

Run each of the frontmatter `checks` on the task's diff.

**Diff = `git diff main`, not `git diff main...HEAD`** (`/implement` never
commits, so three dots is empty). Run `git add -N .` first so new files show,
and `git reset` after the checks, before A4 staging.

**Empty `checks`: skip this section, print `Checks: none`, go to A3.** Do not
review anyway or offer to: that was decided at `/task` time.

Run in order, stop at the first failure:
- `review`: delegate to the `reviewer` subagent via `task` (own context).
- `e2e`: follow the `e2e-tests` skill on this task's criteria.
- `pentest`: follow the `pentest` skill on the surface this task opened.

If a check's skill or agent is not installed, STOP and name it. Never
improvise the check.

**Blocking = incorrect behavior against a criterion, a security hole, or
possible data loss.** Nothing else.

Fix blocking findings, then **rerun `verify` (A1) before rerunning the check**.
**Max two passes**; if a third is needed, hand the rest to the user.
Non-blocking findings go under `## Follow-up` in the task file, or an
`--adhoc` task if they need their own branch.

## A3. Spec drift

No `spec`: skip.

If implementation showed a criterion wrong, incomplete or ambiguous, append to
the task file:

```markdown
## Spec drift
<B id>. <what the spec claims> — <what the code showed> — <what the spec should say>
```

**Do not edit the spec here**: it lives on `main`, and an edit here would be
unstaged and lost on the PR path. Phase B applies it; the note travels in the
task file committed in A4.

## A4. Commit and merge

Stage the code **and this task's own file**, nothing else under `docs/`. The
file holds `## Plan`, ticks and `## Follow-up`, which `/implement` left
uncommitted; leaving it out loses them on the PR path. The archive move still
happens on `main` in B1.

One commit:

```
<id> <task title>

Spec: <spec path>
Covers: <B ids>
```

Then merge into `main`:

- direct: `git switch main`, `git merge --no-ff <branch>`, delete the branch,
  set `merged: true`, continue to phase B (committed in B3).
- pull request: set `merged: true` in the task file **before the commit
  above**, so it is in the push. Push, open the PR, STOP with
  `PR open, merge it and run /done <id>`.

## B1. Write the spec, archive the task

On `main`, in order:

1. **Tick** in the spec's `## Acceptance criteria` each criterion in the
   task's `covers` that `verify` proved or the user confirmed in A1, with the
   task id after it:
   `- [x] **B1.** Three failed attempts lock the account for 15 minutes. (auth-001)`
   Only this command ticks, only at this moment.
2. **Apply `## Spec drift`** if present: correct the criterion (it keeps its
   number; numbers are never reused) and record the change in the spec's
   `Open questions and assumptions`.
3. **Move the task file** to `docs/archive/tasks/<spec-slug>/` (`adhoc/` for
   ad-hoc). Remove the emptied `docs/tasks/<spec-slug>/` folder.
4. **Recompute the spec's `status`** by the `specs` skill table. Ad-hoc: skip.

**The spec is never archived**: it stays in `docs/specs/`. Agents never read
`docs/archive/`.

## B2. Changelog

If the spec now has **no unticked criterion** (`~~` struck ones are withdrawn,
not pending), follow the `changelog` skill for it, once. Otherwise skip
silently. An unticked criterion left by `/drop` (`[Question] still wanted?`)
keeps the feature out of the changelog.

## B3. Refresh and report

Regenerate `docs/workflow/status.md` as defined in `/status`. Commit the
archive move, spec edits, changelog entry and status together on `main` with
`done: <id>`.

Task <id>: done and merged
Proof: verify exit 0 | confirmed by hand, no exit code
Checks: <list, or none>
Follow-up: <count>
Spec: <n>/<n> criteria ticked, status <draft|active|done>
Remaining: <count> in docs/tasks/<spec-slug>/, <count> in all
Next: <id> <title>, run /implement

A task closed on `verify: manual` says so on the Proof line, and the same line
goes into the task file before archiving.
