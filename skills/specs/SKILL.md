---
name: specs
description: Interview the user, then write a short, implementation-ready specification BEFORE writing code. Use for non-trivial features, APIs, components, scripts, project changes, or requests involving specs, requirements, scope, plans, or cahier des charges.
---

# Specs

Turn a request into a short, testable contract.

A spec defines **what the system must do and why**, never **how to build it**.

## Pick a gear

Match the effort to the risk.

| Situation | Action |
| --- | --- |
| Trivial fix, rename, one-off question | No spec. Just code. |
| Clear request, one area, low regression risk | Short spec, 15 to 25 lines. One confirmation round. |
| Vague, cross-cutting, or costly to reverse | Full interview, then a one-page spec. |

## Interview

For full gear only.

- **Read before asking.** Inspect only the context needed to answer pending decisions.
- **Bring your own answer.** Every question includes a recommended answer and a one-line reason.
- **One branch at a time.** Resolve decisions in dependency order.
- **Skip questions that do not change the outcome.**
- **Do not invent business rules.** Ask the user or mark `[Assumption]`.
- **Split oversized work.** If decisions keep multiplying, spec the first coherent piece.
- Stop when no important decision remains open.

## Template

```markdown
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
Each decision taken during the interview, and why, one line each. Only the ones
that close an alternative someone could reasonably reopen.
- <what was decided> — <why, and what it rules out>

## Acceptance criteria
- [ ] **B1.** Observable, testable, unambiguous.

## Open questions and assumptions
- [Question] ...
- [Assumption] ...
```

`## Decisions` is where a resolved question goes. Without it the answer the user
gave you survives only as the shape of a behavior, and the next person to read
the spec reopens the debate you already closed. A `[Question]` that gets answered
moves here with its answer; it does not simply disappear.

The checkboxes under `## Acceptance criteria` are not decoration and you do not
tick them. `/done` ticks each one when a task proves it, and writes the task id
next to it. That is what makes a spec navigable to its tasks, so leave them
unticked and leave the numbers alone.

Add optional sections only when useful: `User flow`, `Data model`, `API contract`, `Security`, `Performance`, `Dependencies`.

## Rules

- No class names, pseudo-code, or internal architecture in `Expected behavior`.
- Number every behavior. Each acceptance criterion cites its behavior number, and every behavior has one. The numbers are stable: they are what later tasks, tests and pull requests refer to.
- One behavior states one thing. If it needs an "and", split it.
- `Out of scope` must contain at least one real boundary.
- Acceptance criteria must be verifiable without interpretation.
- Unresolved decisions go in `Open questions and assumptions`.
- Small feature, small spec.
- Do not duplicate durable project knowledge or architectural decisions. Reference `CONTEXT.md` or an ADR instead.

## Evolving a spec

A spec is not consumed by being implemented. It stays in `docs/specs/` for the
life of the feature, and the second change to that feature edits it rather than
starting a new document.

When you come back to a spec that already has ticked criteria:

- **Never renumber, never reuse.** `B1` means one thing forever: tasks, tests,
  commit messages and archived work all point at it. A new behavior takes the
  next free number, even if it belongs in the middle of the list conceptually.
- **A ticked criterion is delivered.** Leave the tick and the task id. If the
  behavior itself must change, edit the criterion in place, keep its number,
  untick it, and say in `Open questions and assumptions` what changed and why —
  that untick is what makes `/task` pick it up again.
- **A removed behavior is struck, not deleted.** Strike it in **both** places —
  the behavior under `## Expected behavior` and its criterion — and give the
  criterion a reason:

  ```markdown
  - [ ] ~~**B4.**~~ withdrawn 2026-09-19: admin tooling deferred, see lockout-003.
  ```

  Deleting it instead would break every reference to the number and make the
  archived task that carried it unexplainable.

  **A struck criterion is neither delivered nor pending.** Leave its box
  unticked — it was never proven — and understand that `~~` is what takes it out
  of play: `/task` does not split it, `/status` leaves it out of the totals, and
  `changelog` does not hold the feature back for it. Without the strike an
  unticked box means "still to build", and the behavior would be re-split
  forever.
- **No `spec-v2.md`.** One file per feature, always the current contract. Git
  holds every previous state, with the diff and the reason in the commit, which
  is a better history than three files that each claim to be the truth.

Keep any in-document history to the `Open questions and assumptions` lines above.
If you find yourself writing a changelog inside the spec, that belongs in
`CHANGELOG.md`.

## What outlives the feature

Shared vocabulary goes to `docs/CONTEXT.md`.

Expensive-to-reverse decisions such as storage, auth model, sync or async, or data ownership go to `docs/adr/<n>-<slug>.md`.

Keep a one-line pointer in the spec instead of duplicating the content.

## Final check

- [ ] Another developer understands it without verbal explanation.
- [ ] Scope is explicit.
- [ ] The states and failure cases that matter are covered.
- [ ] Every behavior is numbered and matched by an acceptance criterion.
- [ ] Acceptance criteria are testable.
- [ ] No business rule was invented.
- [ ] Durable knowledge is stored elsewhere.

## Delivery

Save to `docs/specs/<short-name>.md`, and see `/spec` for the mechanics around it.

A spec is a **checkpoint, not permission to code**.

After creating it, stop for review unless the user explicitly requested end-to-end execution.
