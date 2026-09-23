# specloop

[![npm](https://img.shields.io/npm/v/@sergetouvoly/specloop)](https://www.npmjs.com/package/@sergetouvoly/specloop)
[![license](https://img.shields.io/npm/l/@sergetouvoly/specloop)](LICENSE)

A spec-driven workflow for AI coding agents. Six commands, five skills, three
subagents, installed in one command for Claude Code, opencode and Kilo Code,
and by your agent for Cursor, Copilot or anything else that reads markdown.

```bash
npx @sergetouvoly/specloop init
```

```
/spec  →  /task  →  /implement  →  /done
   ↑         ↑          └── autonomous loop ──┘
   └─ you ───┘
```

You approve the contract and the breakdown. The agent does the rest.

## Why

An agent given a vague request invents the decisions you forgot to make, and you
discover them at review time. Writing a spec first moves those decisions to the
front, where they cost seconds instead of a rewrite.

Most spec workflows stop at "write a nice document". This one is built around
three properties that survive contact with a real agent:

**Nothing is proven by a checkbox.** Each acceptance criterion names the test
that proves it. `/done` runs the test command and reads its exit code, again
after every fix a check produced. An agent that just wrote the code always
believes it works, so its opinion is not the gate.

A project with no test runner can set `verify: manual` and close on a human yes
instead. It is the one escape hatch, it is the single biggest weakening of the
setup, and both `/task` and `/done` say so out loud every time it is used.

**Project state lives in one place.** Task state is the folder a file sits in,
and `docs/status.md` is regenerated from the filesystem, never maintained by
hand. It cannot drift, because nothing has to remember to update it.

**A dirty tree is resolved, not reported.** Every command that needs a clean
tree runs the `clean-tree` skill: it names what is dirty, offers the exact git
commands, runs your choice and carries on with the arguments you typed. You
never retype a prompt because of a stash.

**Review runs in a separate context.** An agent reviewing its own work in the
same session confirms its own assumptions, including the wrong ones. The
reviewer subagent is read-only and has not seen the reasoning behind the diff.

## Install

Needs Node 18 or later, and a git repository.

```bash
npx @sergetouvoly/specloop init
```

No LLM involved: the installer asks six questions, each with an answer it
detected for you, so Enter six times is a valid install.

1. **Agents**: `claude`, `opencode`, `kilo`, one or several. Detected from the
   folders already in the project.
2. **Docs folder**: `docs` unless you keep documentation elsewhere.
3. **Integration branch, merge style, task branch prefix**: from `git`.
4. **Test command**: from `package.json`, `pyproject.toml`, `Cargo.toml`,
   `go.mod` or a `Makefile`. This is the gate `/done` runs. With none, tasks
   close on a human yes, and the installer says so.
5. **Optional checks**: `e2e` when an e2e runner is installed, `pentest` when
   the project serves HTTP. Each installs its skill.
6. **Claude Code only: the guard hook.** See below.

It then shows every file it will write, and writes nothing until you say yes.
Existing files are never overwritten unless you ask; `CLAUDE.md`, `AGENTS.md`
and `.claude/settings.json` only get specloop's own block or hooks added.

```
.claude/ or .opencode/ or .kilo/   commands, agents, skills, in that agent's format
CLAUDE.md / AGENTS.md              a delimited Workflow block with your answers
docs/                              specs, tasks/active, archive/tasks, adr,
                                   CONTEXT.md and status.md to start from
.specloop/                         your answers, and every generated file as
                                   generated: the baseline for updates
```

It ends by checking 34 permission probes against the rules it wrote: the
implementer cannot read a spec or commit, the reviewer cannot write, the spec
writer cannot touch code, and so on. Then fill in `docs/CONTEXT.md`, commit
everything, `.specloop/` included, and run `/spec` on your next feature.

Every question has a flag for scripts and CI: `--targets=claude,opencode`,
`--docs`, `--branch`, `--merge=direct|pr`, `--prefix`, `--test` or
`--no-test`, `--checks=e2e,pentest`, `--no-guard`, `--yes`, `--dry-run`.

### How permissions are enforced

| Agent | Enforced by |
| --- | --- |
| opencode, Kilo Code | the agent itself: the `permission` block of each agent file, last match wins |
| Claude Code, guard on | `.claude/hooks/specloop-guard.js`, a hook that applies those same rules |
| Claude Code, guard off | nothing: the rules are prose the model usually follows |

Claude Code cannot hold per-agent path and command rules in an agent file, so
the guard does it. Typing `/spec` or `/task` switches the spec writer's rules
on, `/implement` the implementer's, and they stay on for the follow-up messages
of that command until you type another slash command. The agent itself cannot
switch or clear them: only what you type does. The reviewer runs as a subagent
with its own hook. Claude Code runs project hooks once you have trusted the
folder.

The guard is the one piece of code that runs in your project. It only ever
blocks: anything it lets through still goes through Claude Code's own
permissions.

### Update

```bash
npx @sergetouvoly/specloop@latest update
```

Regenerates every file with the answers you gave at install, and compares three
versions of each: what was generated last time, what is on disk now, and what
this version generates.

- you never touched it: replaced with the new version
- only you changed it: left alone
- both changed: merged, with conflict markers where the two edits collide,
  listed in the report
- you deleted it: stays deleted

The `@latest` matters: without it, `npx` may reuse the version it cached the
first time and report that there is nothing to do.

### Any other agent

Cursor, Copilot, or anything else: point your agent at the setup guide, which
does the same job by hand, in that agent's native format:

```
Read SETUP.md from https://github.com/Sergetouvoly/spec-driven-dev and set this project up.
```

## The loop

| Command | What it does | Stops for you |
| --- | --- | --- |
| `/spec <idea>` | Interviews you, writes a spec with numbered behaviors | yes, for review |
| `/task <spec>` | Splits it into numbered tasks, each covering behaviors | yes, after committing them |
| `/implement` | Branch, plan, write tests, implement, until tests pass | only if blocked |
| `/done` | Runs checks, merges, ticks the spec, archives, refreshes status | only if a check fails |
| `/drop <id> <why>` | Abandons a task and reopens its behaviors | no |
| `/status` | Rebuilds and shows where the project stands | no |

A fresh session runs `/status` and knows what is in progress, what is next, and
what needs a decision.

## What it writes in your project

```
CHANGELOG.md            one line per delivered feature, for humans
docs/
├── CONTEXT.md             shared vocabulary, stable
├── status.md              generated, never edited by hand
├── adr/                   decisions that are expensive to reverse
├── specs/                 the contracts, durable, never archived
├── tasks/active/<spec>/   open work, one folder per spec, one file per task
└── archive/tasks/<spec>/  finished work, same folders, never read by an agent again
```

Six artifacts, and each answers a question none of the others do: the spec what
the product must do, the task what to build next, `status.md` where things stand
right now, `CONTEXT.md` what the words mean, the ADRs what was decided and cannot
be cheaply undone, `CHANGELOG.md` what a user got. Git holds the detailed history
under all of it, and where the code lives is a `glob` away, always current.

The workflow itself does not run: what lands in your project is markdown. The
installer runs once, through `npx`, and is not in your `package.json`. The one
exception is the Claude Code guard, a single dependency-free file that exists
because Claude Code has no other way to hold per-agent permissions, and that
you can decline at install.

Beyond that, it is a deliberate boundary, and the test for it is simple. A generated file
holding the repository's file tree sounds free — until you notice your agent's
own `glob` answers the same question on demand, scoped to what you actually
asked about rather than the whole tree, and always current. The generated copy
would cost a pre-commit hook to install, a stale-state problem when the hook
does not fire, and a second implementation for every shell it has to run in.
Comparable workflows ship hundreds of scripts, each maintained twice, to keep
that kind of file alive. Prefer the capability your agent already has.

Plus the commands, skills and subagents in your agent's own configuration folder.
Nothing else. No runtime, no dependency, no lock-in: delete the folder and your
repository is unchanged.

## Two lifecycles, and they are not the same

**A spec is durable. A task is disposable.** This is the distinction the rest of
the design hangs on, and getting it wrong is what makes spec workflows rot.

```
SPEC  docs/specs/auth.md ───────────────────────────────── stays, forever
  │
  │  /task splits the unticked criteria
  ▼
TASK  active/auth/auth-001.md ─▶ branch ─▶ verify ─▶ review ─▶ archive/tasks/auth/
  │                                                              (agents never
  │  /done ticks the criterion it proved, with the id             read it again)
  ▼
SPEC  - [x] **B1.** ... (auth-001)
```

A task is finished work: it names a branch that is gone, a plan against code that
has since changed, and boxes that are all ticked. Reading it again teaches an
agent about a world that no longer exists, so it goes to `docs/archive/tasks/` and
the permissions stop every agent from opening it.

A spec is the opposite. It is most useful *after* delivery: to evolve the feature,
to re-split what a `/drop` reopened, and for the reviewer to check the next task
against what was actually promised. So it is never archived. `/spec` edits it in
place, behavior numbers are permanent, a withdrawn behavior is struck rather than
deleted, and there is no `spec-v2.md` — git holds the previous states, with the
reason in the commit.

## Traceability without a fourth document

Every workflow like this eventually grows an index file mapping requirements to
tasks to tests, and it is always stale, because it is a copy of facts that live
elsewhere.

This one has no index. `/done` ticks the spec's acceptance criterion at the
moment a task proves it, and writes the task id next to it:

```markdown
- [x] **B1.** Three failed sign-ins lock the account for 15 minutes. (auth-001)
- [ ] **B4.** The owner is emailed when a lock happens.
```

Which gives both directions from artifacts that already existed. **Spec → task:**
open the spec, every delivered behavior names the task that delivered it, and the
unticked ones are exactly what is left — which is how `/task` splits a spec a
second time without reading the archive to find out what is done. **Task → spec:**
`spec:` and `covers:` in the task frontmatter, and `Spec:`/`Covers:` in the commit
message, so `git log --grep` gets from a behavior to its code and its tests.

Nobody maintains any of it. The tick is written once, by the command, at the one
moment it becomes true.

## Permissions

Three agents, and the boundary each one has is the one its job needs.

| | spec-writer | implementer | reviewer |
| --- | --- | --- | --- |
| reads | everything but the archive | everything but specs and the archive | everything but the archive |
| writes | `docs/**` only | code, not specs, ADRs or the archive | nothing at all |
| shell | deny by default, read-only git plus committing `docs/` | allow by default, denylist | deny by default, `git diff` and `git status` |
| commits | `docs/` only | never | never |
| delegates to | a read-only search subagent | nothing | nothing |

**The implementer cannot read the specs.** Not because it should not know what the
contract says — but because the task *is* the contract, projected. `/task` holds
the spec open once, for all the tasks it writes, and transcribes the criteria word
for word into each one. Reading the spec again would buy an implementer nothing it
does not already hold, and it would pay for it on every task, forever. So a task
an implementer cannot plan against is a defect in `/task`, fixed where the fix
also helps the next task — not a reason to go looking.

The reviewer *can* read the spec, and it is the only agent that opens one after
`/task` ran. That is deliberate: it is checking `spec → task → code`, which
includes whether the transcription itself drifted.

**A subagent is the bypass that looks legitimate.** It runs on *its own*
permissions, not the caller's, so delegating a read reaches whatever the caller's
own `read` deny forbids — and in a transcript it reads like ordinary delegation
rather than a workaround. The implementer therefore delegates to nothing at all,
even though a read-only search agent is exactly what a large codebase calls for.
Its `glob` and `grep` answer to its own permissions, which is why those are the
tools it gets. The spec writer keeps one, because the code is its to read anyway.

**`*` is not `**`.** In a path glob, `*` stops at a slash, so `docs/archive/*`
never matches `docs/archive/tasks/auth/auth-001.md` — the only place an archived task
ever is. Every path permission in the three agent files ends in `**`, and the
setup guide probes the nested path rather than the folder.

**A wall for the reviewer, a fence for the implementer.** The reviewer needs four
command forms, so its shell is deny-by-default with an allowlist: a wall. The
implementer has to run whatever the project uses to build and test itself, so its
shell is allow-by-default with a denylist: a fence. The fence denies the *path* in
any command — `*docs/specs/*` — rather than trying to enumerate the programs that
can print a file, because that list is never finished. It also denies every tool
that reads from a revision or walks a tree without naming a path: `git show`,
`git log`, `git cat-file`, `git grep`, `git blame`, `git archive`, `tar`,
`find -exec`.

And a fence has an honest edge: a shell that is allow-by-default and contains the
project's own interpreters cannot be sealed. A determined `python -c` gets
through. The denylist stops the reflex, the `read` deny stops the tool, and the
real guarantee is that there is nothing behind the fence worth the trip.

## Agent support

| Agent | Installed by | Commands | Skill | Subagents | Enforced permissions |
| --- | --- | --- | --- | --- | --- |
| Claude Code | `npx` | yes | yes | yes | yes, with the guard hook |
| Kilo Code | `npx` | yes | yes | yes | yes |
| opencode | `npx` | yes | yes | yes | yes |
| Cursor | SETUP.md | yes | as a rule | no | no |
| Copilot | SETUP.md | as prompts | as instructions | partial | no |
| Other | SETUP.md | from the same source files | | | |

Read the last column honestly. On Kilo and opencode, and on Claude Code with the
guard, "the spec writer cannot edit source files" is enforced: the call fails.
On Cursor and Copilot, or on Claude Code without the guard, the same line is a
convention the model usually follows. The workflow still works, the guarantees
become conventions, and the installer tells you which of the two you got.

Not on the list? The setup guide reads your agent's existing configuration
folder, matches the closest format and asks you to confirm before writing.

## Repository layout

```
commands/       one file per command
agents/         the spec writer, the reviewer and the implementer
skills/specs/   the skill that owns the gears, the interview and the template
skills/clean-tree/  the skill that resolves a dirty tree instead of stopping
skills/changelog/   one line per delivered feature, called by /done
skills/e2e-tests/   optional check: proves a journey against the running app
skills/pentest/     optional check: probes the surface a task just opened
SETUP.md        the installer for agents the CLI does not cover, run by the agent
bin/specloop.js the CLI: questions, plan, report
lib/            detection, substitution, one renderer per agent, the update merge
lib/templates/specloop-guard.js   the Claude Code guard hook
test/           node --test, no dependencies
package.json    the npm package, no dependencies
```

The files under `commands/`, `agents/` and `skills/` are the sources, written in
the format opencode and Kilo read natively. They say `main`, `docs/` and
`<branch-prefix>` in plain form so they stay readable; the tests enforce the two
rules that make substituting them safe: `main` only ever appears inside code,
and every `docs/` is a path.

## Design notes

**Specs and tasks live on the main branch only.** A task archived on a feature
branch is invisible to every other session until that branch merges. `/done`
merges first, then archives.

**Task numbers are scoped to their spec** (`auth-001`), so two features split in
parallel cannot collide. Tasks are filed the same way: `docs/specs/auth.md` owns
`docs/tasks/active/auth/`, ad-hoc tasks sit in `adhoc/`, and the archive keeps
the same folders. What is left of a feature is one `glob` away.

**Every behavior is numbered and covered.** `/task` reports `n/n` coverage over
the criteria that are still unticked, and `/drop` reopens the behaviors an
abandoned task was carrying. A requirement cannot disappear silently while the
spec still promises it, and a behavior number is never reused or reassigned.

**Blocking means three things only**: incorrect behavior against a criterion, a
security hole, possible data loss. Everything else is follow-up. A reviewer that
always finds something teaches you to ignore it.

**A sentence in a command is a preference. A permission in an agent file is a
boundary.** Every "never" in the commands has a matching `deny` in the agent
that runs it: the spec writer cannot edit code, the implementer cannot commit,
nobody can read the archive. On targets without enforced permissions, these
fall back to conventions, and the setup guide says which you got.

The corollary is that a permission has to be *tested*, not read. Two of the
denies in this repository were the right rule written with the wrong glob, and
they looked completely correct until something probed the nested path.

**Three commands run unbound, and that is the design.** `/spec`, `/task` and
`/implement` are bound to an agent that constrains them. `/done`, `/drop` and
`/status` are not: closing a task means editing code after a review, committing,
reaching the integration branch, merging, deleting a branch and moving files
into the archive. An agent allowed to do all of that denies nothing worth
denying, and a permission that denies nothing is worse than none — it reads like
a guarantee.

So the privilege is stated instead of dressed up: those three are the trusted
steps, they run with whatever your tool gives the main session, and the setup
guide lists them as unbound in its report. If that is too much for your project,
the place to narrow it is your tool's own permission settings, not a decorative
agent file.

**The spec is read once per feature, not once per task.** `/task` transcribes
the criteria and the binding constraints into each task file while it has the
spec open, for all the tasks it writes. That is the whole token strategy: the
expensive document is opened once by the agent that is already holding it, and
never again. A budget written as prose is a preference the model eventually
overrules; written as a `deny` the tool enforces, it holds. See **Permissions**
above for how far it holds, and the setup guide for the probes that check.

**Two review passes maximum.** Then the remainder goes to you. A second pass is
for a reviewer that blocked, not for a second opinion — there is one reviewer,
and adding a `security-reviewer` and a `quality-reviewer` next to it would just
be the same diff read three times by agents with the same training.

**The changelog is not the task list.** `CHANGELOG.md` gets one line per
*delivered feature*, written from the spec's objective in the words a user would
recognise, at the moment the last criterion is ticked. Generating it from
`git log` would be the obvious move and it is precisely wrong here: our commit
subjects are task ids, so the generator would reproduce `docs/archive/tasks/` in
the one file humans were told they could read.

## Not for you if

You ship small changes to a codebase you know by heart. The ceremony costs more
than the mistakes it prevents. Use `/task --adhoc` for those, or nothing at all.

`--adhoc` with `checks: []` is the fast lane: one task file, a branch, the test
command, a merge. No spec, no review pass, no interview. `verify` still has to
exit 0 — that one never comes off, because it is the only thing in the workflow
that is not an opinion.

A spec is a checkpoint, not a ritual. If it is not preventing rework, drop it.

## Contributing

Edit the file under `commands/`, `agents/` or `skills/`, run `npm test`, and
open a pull request. There is nothing to build.

To release, bump `version` in `package.json` (a patch for wording, a minor for
a changed behavior of a command), commit, then `npm publish`. Projects pick it
up with `npx @sergetouvoly/specloop@latest update`, and the version lands in
their `.specloop/config.json`.

Support for one more agent is a renderer in `lib/targets.js`, a line in the
`SETUP.md` layout table for agents installed by hand, and a test.

## License

MIT
