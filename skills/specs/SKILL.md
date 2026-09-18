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

## Acceptance criteria
- [ ] **B1.** Observable, testable, unambiguous.

## Open questions and assumptions
- [Question] ...
- [Assumption] ...
```

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

Save to `docs/specs/<short-name>.md`. There is no fallback location: the docs root is set once at setup.

A spec is a **checkpoint, not permission to code**.

After creating it, stop for review unless the user explicitly requested end-to-end execution.
