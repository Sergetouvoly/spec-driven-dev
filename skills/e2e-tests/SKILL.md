---
name: e2e-tests
description: Use when a task's `checks` include `e2e`, to prove a user journey end to end against the running application rather than through unit tests. Drives the real app through the criteria that describe a journey, lands the run as a permanent test when the project has an e2e runner, and returns a pass or block verdict.
---

# e2e-tests

`verify` proved each criterion in isolation. This proves they hold **in
sequence, against the real application**, which is the only place a journey can
break.

You run inside `/done`, after `verify` passed and after `review`. Your verdict
feeds the same gate: blocking means incorrect behavior against a criterion, a
security hole, or possible data loss. Nothing else.

## 1. Pick the journeys

Read the task's `## Done when`. A journey is a criterion a **user** could
narrate: a sequence of visible steps ending in an observable state. "The
password reset link expires after an hour" is a journey. "The token is signed
with HS256" is not: it has no user, and `verify` already owns it.

If no criterion is a journey, say so in one line and return `pass`. An `e2e`
check on a task that has no journey is ceremony, and `/task` should not have
asked for it. Name that in the verdict so the next split is better.

## 2. Start the real thing

Start the application the way the project starts it: its own script, its own
seed data, its own environment file. Read `docs/CONTEXT.md` and the project
manifest for the command rather than inventing one.

Two rules, and they are the whole value of this check:

- **Against a real backend.** A mocked API proves your mock, and your mock was
  written by the same session that wrote the code.
- **Against your own machine only.** Never a shared staging, never production,
  never a host the project does not own. If the app cannot run locally, say so
  and return `block` with that as the reason: an e2e check you could not run is
  not a pass.

## 3. Drive it

For each journey, walk the steps a user would, and assert only what a user
would see: rendered text, a redirect, a status code, an email in the outbox, a
row the UI shows back.

Never reach into the database to assert, and never call an internal function to
set up a step a user would have to perform. Both quietly replace the journey
with a shortcut, which is exactly the thing that keeps working while the real
path is broken.

Where the journey needs data, create it through the application. If that is
impossible, use the project's own seed or factory, and say in the verdict which
step you could not perform as a user.

## 4. Land it, if the project has somewhere to put it

If the project has an e2e runner (Playwright, Cypress, Selenium, or its own
harness), write each journey into that suite, in the project's existing style
and folder, and run it there. The check then costs nothing the next time, and
the journey is protected by CI instead of by this session.

If it has none, drive the app by hand for this run, and add one line to the
verdict: the project has no e2e suite, so this journey is proven once and not
guarded.

Do not introduce an e2e framework here. Adding a dependency and a CI stage is a
project decision, not a step in closing a task. Recommend it in the verdict.

## 5. Verdict

Return this and nothing else:

```
E2E: pass | block

JOURNEYS
- <criterion id> <journey in one line> <pass or fail>

BLOCKING
- <criterion id> <the step that failed> <what you saw instead>

NOTES
- <landed in <path>, or: no e2e suite, proven once>
```

A journey that fails for a reason outside the diff — a service that will not
start, a fixture the task never touched — is not blocking. Say so, name it, and
return `pass`. Blocking this task on the project's pre-existing breakage teaches
the caller to skip the check.
