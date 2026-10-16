---
name: e2e-tests
description: Use when a task's `checks` include `e2e`, to prove a user journey end to end against the running application rather than through unit tests. Drives the real app through the criteria that describe a journey, lands the run as a permanent test when the project has an e2e runner, and returns a pass or block verdict.
---

# e2e-tests

`verify` proved each criterion alone. This proves them **in sequence, against
the real application**.

Runs inside `/done`, after `verify` and `review`. Blocking = incorrect behavior
against a criterion, a security hole, or possible data loss. Nothing else.

## 1. Pick journeys

Read `## Done when`. A journey is a criterion a **user** could narrate: visible
steps ending in an observable state ("the reset link expires after an hour").
"The token is signed with HS256" is not one.

No journey: say so in one line, return `pass`, and note that `/task` should not
have asked for `e2e`.

## 2. Start the real app

Use the project's own script, seed data and env file; find the command in
`docs/reference/CONTEXT.md` and the manifest.

- **Real backend**, no mocks.
- **Local machine only**: never staging, production or a host the project does
  not own. Cannot run locally: return `block` with that reason.

## 3. Drive it

Per journey, walk the user's steps and assert only what a user sees (text,
redirect, status code, email in the outbox, a row the UI shows).

Never assert via the database or set up a step through an internal function.
Create data through the app; else use the project's seed/factory and name in
the verdict the step not done as a user.

## 4. Land it

If the project has an e2e runner (Playwright, Cypress, Selenium, own harness),
write each journey into that suite, in its style and folder, and run it there.
Otherwise drive by hand and note: no e2e suite, journey proven once and not
guarded. Do not introduce a framework; recommend one in the verdict.

## 5. Verdict

Return only this:

```
E2E: pass | block

JOURNEYS
- <criterion id> <journey in one line> <pass or fail>

BLOCKING
- <criterion id> <the step that failed> <what you saw instead>

NOTES
- <landed in <path>, or: no e2e suite, proven once>
```

A failure outside the diff (a service that will not start, an untouched
fixture) is not blocking: name it and return `pass`.
