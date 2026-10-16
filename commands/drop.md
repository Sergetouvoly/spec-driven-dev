---
description: Abandon a task that is obsolete, wrong, or no longer worth doing
---

# /drop

Input: $ARGUMENTS, a task id followed by a reason.

Reason missing: ask for it.

## 1. Checks

Read the task. `merged: true`: already closed, STOP and say so.

Follow the `clean-tree` skill, then switch to `main`.

## 2. Branch

If its branch exists, check for commits not in `main`
(`git log main..<branch> --oneline`):
- none: delete it.
- some: keep it and name it in the report.

## 3. Archive

Append to the task file:

```markdown
## Dropped
<YYYY-MM-DD>. <reason>
```

Move it to `docs/archive/tasks/<spec-slug>/` (same folder name as under
`docs/tasks/`); remove the folder if emptied.

If the task covered spec behaviors, add to the spec's
`Open questions and assumptions`:

`[Question] B1, B3 dropped with <id>: still wanted?`

Leave their criteria unticked (only `/done` ticks): that puts them back in
front of `/task` if wanted, and keeps the feature out of `CHANGELOG.md`.

Recompute the spec's `status` by the `specs` skill table (last task dropped →
`draft`).

## 4. Refresh and report

Regenerate `docs/workflow/status.md` as defined in `/status`. Commit on `main`
with `drop: <id>`.

Dropped <id>: <reason>
Branch: <deleted, or kept with n commits>
Uncovered behaviors: <B ids, or none>
Spec status: <draft|active|done, or none for an ad-hoc task>
Remaining: <count> in docs/tasks/<spec-slug>/, <count> in all
