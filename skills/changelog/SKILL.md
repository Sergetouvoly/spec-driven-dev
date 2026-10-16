---
name: changelog
description: Maintains CHANGELOG.md as a human-readable record of what changed in the product. Use when a feature's last criterion is ticked in /done, or when the user asks to update, generate or backfill the changelog. One entry per delivered feature, written from its spec, never one per commit or per task.
---

# changelog

`CHANGELOG.md` records **what changed in the product**, for readers who do not
read the repository.

## Unit: a feature, never a commit or a task

Written when a **feature** is delivered (every criterion in its spec ticked),
from the spec's `## Objective`, in a user's words. Never generate from `git log`:
commit subjects are task ids.

## 1. Check first

Grep `CHANGELOG.md` for the spec slug. **Present: stop and say so.** Nothing
else here runs twice.

No `CHANGELOG.md`: create it with the `# Changelog` title. No backfill of
unrequested history.

## 2. Write one line

Read the spec: `## Objective` for what and who, ticked criteria for what is
actually delivered (an unticked promise is not in this release).

One bullet; two only for two unrelated user-facing changes. Needing more means
the spec was too big: say so.

- Say what a user can now do, not what was built.
- No file names, task ids, criterion numbers or library names.
- A breaking change or migration goes first with `**Breaking:**`.
- End with the slug in parentheses.

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
- `## YYYY-MM-DD` headings (feature completion date), newest first, inserted
  after the title.
- No version numbers.

## When the user asks directly

"Update the changelog" outside `/done`: list specs whose criteria are all
ticked (`grep -l '^status: done'` finds candidates; ticks win), drop slugs
already in the file, write the missing ones. Show the lines and ask before
writing more than three.

Never write an entry for unfinished work.
