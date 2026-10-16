---
name: specs
description: Interview the user, then write a short, implementation-ready specification BEFORE writing code. Use for non-trivial features, APIs, components, scripts, project changes, or requests involving specs, requirements, scope, plans, or cahier des charges.
---

# Specs

Turn a request into a short, testable contract: **what the system must do and
why**, never **how**.

## Gear

| Situation | Action |
| --- | --- |
| Trivial fix, rename, one-off question | No spec. Just code. |
| Clear request, one area, low regression risk | Short spec, 15 to 25 lines. One confirmation round. |
| Vague, cross-cutting, or costly to reverse | Full interview, then a one-page spec. |

## Interview (full gear only)

- Read only the context needed for pending decisions.
- Every question carries a recommended answer and a one-line reason.
- Resolve decisions in dependency order; skip those that do not change the outcome.
- Never invent business rules: ask, or mark `[Assumption]`.
- Oversized: spec the first coherent piece.
- Stop when no important decision is open.

## Template

```markdown
---
status: draft
---

# SPEC: <Feature name>

## Objective
The problem and who has it. 2 to 4 sentences. No technical solution.

## Scope
**Included**
- ...

**Out of scope**
- ...

## Expected behavior
Observable behavior only. Happy path first, then the states and failures that matter.
- **B1.** When <situation>, then <observable result>.
- **B2.** While <state>, <observable result>.
- **B3.** If <undesired condition>, then <mitigation>.

## Rules and constraints
Business rules, permissions, invariants, audit requirements, and technical
constraints that affect behavior.

## Decisions
Decisions taken in the interview, one line each, only those that close an
alternative someone could reopen.
- <what was decided> — <why, and what it rules out>

## Acceptance criteria
- [ ] **B1.** Observable, testable, unambiguous.

## Open questions and assumptions
- [Question] ...
- [Assumption] ...
```

An answered `[Question]` moves to `## Decisions` with its answer.

Never tick `## Acceptance criteria`: `/done` ticks each when a task proves it
and writes the task id next to it. Leave them unticked and the numbers alone.

## Status

Frontmatter `status`, so `grep -L '^status: done' docs/specs/*.md` lists what
is unfinished.

| Status | Means |
| --- | --- |
| `draft` | ≥1 pending criterion, no open task in `docs/tasks/<spec-slug>/` |
| `active` | ≥1 pending criterion, its tasks folder holds a task |
| `done` | no pending criterion: all ticked or struck through |

Pending = unticked and not struck with `~~`.

Status is a summary, never a decision: ticks are the truth and `/status`
rewrites a wrong one. Every command that ticks a criterion or moves a task
recomputes it. A new spec starts at `draft`; an evolved one is recomputed after
editing (a new or unticked criterion takes `done` back to `draft`, or `active`
if tasks are open).

Optional sections, only when useful: `User flow`, `Data model`, `API contract`,
`Security`, `Performance`, `Dependencies`.

## Rules

- No class names, pseudo-code or architecture in `Expected behavior`.
- Number every behavior; each acceptance criterion cites its number and every
  behavior has one. Numbers are stable.
- One behavior states one thing: an "and" means split.
- `Out of scope` has at least one real boundary.
- Criteria verifiable without interpretation.
- Unresolved decisions go in `Open questions and assumptions`.
- Small feature, small spec.
- Do not duplicate durable knowledge: reference `CONTEXT.md` or an ADR.

## Evolving a spec

A spec stays in `docs/specs/` for the life of the feature; later changes edit
it, never a new document.

- **Never renumber or reuse.** A new behavior takes the next free number.
- **Ticked = delivered.** Keep tick and task id. To change the behavior, edit
  the criterion in place, keep its number, untick it, and say what changed and
  why in `Open questions and assumptions` (the untick makes `/task` re-pick it).
- **Removed = struck, not deleted**, in **both** the behavior and its criterion,
  with a reason:

  ```markdown
  - [ ] ~~**B4.**~~ withdrawn 2026-09-19: admin tooling deferred, see lockout-003.
  ```

  A struck criterion is neither delivered nor pending: leave its box unticked;
  `/task` does not split it, `/status` excludes it, `changelog` ignores it.
- **No `spec-v2.md`.** One file per feature; git holds history.

Keep in-document history to those `Open questions and assumptions` lines; a
changelog belongs in `CHANGELOG.md`.

## What outlives the feature

- Shared vocabulary → `docs/reference/CONTEXT.md`.
- Expensive-to-reverse decisions (storage, auth model, sync/async, data
  ownership) → `docs/reference/adr/<n>-<slug>.md`.

Keep a one-line pointer in the spec.

## Final check

- [ ] Understandable without verbal explanation.
- [ ] Scope explicit.
- [ ] Relevant states and failures covered.
- [ ] Every behavior numbered and matched by a criterion.
- [ ] Criteria testable.
- [ ] No business rule invented.
- [ ] Durable knowledge stored elsewhere.
- [ ] `status` matches the criteria and the tasks folder.

## Delivery

Save to `docs/specs/<short-name>.md` (mechanics in `/spec`). A spec is a
**checkpoint, not permission to code**: stop for review unless the user asked
for end-to-end execution.
