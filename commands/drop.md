---
description: Abandon a task that is obsolete, wrong, or no longer worth doing
---

# /drop

Input: $ARGUMENTS, a task id followed by a reason.

If the reason is missing, ask for it. A task dropped without a reason is a hole
in the trail: six months later nobody knows whether it was done, cancelled or
forgotten.

## 1. Checks

Read the task. If `merged: true`, it is already closed: STOP and say so.

Follow the `clean-tree` skill, then switch to `main`.

## 2. Branch

If its branch exists, check whether it holds commits not in `main`
(`git log main..<branch> --oneline`).

- No commits: delete it.
- Commits: leave it, and name it in the report. Deleting work the user may still
  want is not this command's call.

## 3. Archive

Append to the task file:

```markdown
## Dropped
<YYYY-MM-DD>. <reason>
```

Move it to `docs/archive/tasks/<spec-slug>/`, the same folder name it had under
`docs/tasks/`. If its folder there is now empty, remove it.

If the task covered behaviors of a spec, those behaviors are now uncovered. Add
a line to the spec's `Open questions and assumptions`:

`[Question] B1, B3 dropped with <id>: still wanted?`

Otherwise a behavior silently disappears from the project while its spec still
claims it.

Leave their acceptance criteria unticked, which is what they already are: only
`/done` ticks, and this task never finished. That is what puts them back in front
of `/task` if the answer to the question is yes, and it is what keeps the feature
out of `CHANGELOG.md` until someone decides.

## 4. Refresh and report

Regenerate `docs/workflow/status.md` as defined in `/status`. Commit on `main` with the
message `drop: <id>`.

Dropped <id>: <reason>
Branch: <deleted, or kept with n commits>
Uncovered behaviors: <B ids, or none>
Remaining: <count> in docs/tasks/<spec-slug>/, <count> in all
