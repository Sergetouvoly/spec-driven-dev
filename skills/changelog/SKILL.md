---
name: changelog
description: Maintains CHANGELOG.md as a human-readable record of what changed in the product. Use when a feature's last criterion is ticked in /done, or when the user asks to update, generate or backfill the changelog. One entry per delivered feature, written from its spec, never one per commit or per task.
---

# changelog

`CHANGELOG.md` answers one question: **what changed in the product.** It is the
only artifact in this workflow written for someone who does not read the
repository.

## The unit is a feature, never a commit and never a task

A task is a slice of work. Twelve of them can land before a user can see
anything, and their titles are written for the agent that will implement them:
`auth-003 Lock the account after three failures`. A changelog with one line per
task is `docs/archive/tasks/` again, in a file humans were told they could read,
and it is the one thing this file must not become.

So the entry is written when a **feature** is delivered — every criterion in its
spec ticked — and it is written from the spec's `## Objective`, in the words a
user would recognise. `git log` is the commit history and `docs/archive/tasks/` is
the work history. Both already exist and neither is this.

That is also why there is no script here. Generating from `git log` is the one
approach that cannot work: our commit subjects *are* the task ids, so a generator
would produce exactly the list this file exists to avoid. The wording is a
judgement, and the only mechanical part is the check in step 1.

## 1. Check before you write

Grep `CHANGELOG.md` for the spec slug. **If it is already there, stop and say so.**
Nothing else in this skill runs twice.

That grep is the whole of the idempotency: every entry carries its slug, so the
file is its own record of what has been announced. Re-running this skill on the
same feature, in the same session or six months later, changes nothing.

If `CHANGELOG.md` does not exist, create it with the `# Changelog` title and go
on. Do not backfill history you were not asked for: a changelog that starts on
the day it was created is honest, and one reconstructed from old commits reads
authoritative while being a guess.

## 2. Write one line

Read the spec. Take `## Objective` for what the feature does and who has the
problem, and the ticked criteria for what it actually delivers — those are the
promises that were proven, and a promise the spec made but no task ticked is not
in this release.

One bullet. Two if the feature genuinely changed two unrelated things for the
user. If you need more, the spec was too big and that is worth saying, not
padding.

- Write what a user can now do, not what was built. "Accounts lock for 15 minutes
  after three failed sign-ins", not "Added lockout middleware and a migration".
- No file names, no task ids, no criterion numbers, no library names.
- Name a breaking change or a migration explicitly, first, with `**Breaking:**`.
  That line is the only reason anyone reads a changelog under pressure.
- End with the slug in parentheses. It is how the next run knows, and how a
  reader gets from a line back to `docs/specs/<slug>.md`.

## Format

```markdown
# Changelog

## 2026-04-12

- **Breaking:** API tokens issued before this release stop working; reissue them
  from the account page. (token-rotation)
- Accounts lock for 15 minutes after three failed sign-ins, and the owner is
  emailed. (authentication)

## 2026-03-30

- Learners can be suspended without losing their progress. (learner-suspension)
```

- One `# Changelog` title.
- `## YYYY-MM-DD` headings, newest first, using the date the feature completed.
- New dates are inserted after the title, never appended at the end.
- No version numbers. Releases are a project decision this workflow does not own,
  and a `## 1.4.0` heading nobody maintains is worse than a date that is always
  true.

## When the user asks directly

"Update the changelog" outside `/done` means: list the specs whose criteria are
all ticked, drop the ones whose slug is already in the file, and write the
missing ones. Show the lines and ask before writing more than three — a changelog
that grew by nine bullets in one go is one nobody reads.

Never invent an entry for work in progress. A feature with one unticked criterion
is not delivered, whatever the branch looks like.
