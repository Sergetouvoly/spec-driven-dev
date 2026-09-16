# specloop

A spec-driven workflow for AI coding agents. Six commands, one skill, two
subagents. Portable across Claude Code, Kilo Code, opencode, Cursor, Copilot and
anything else that reads markdown.

```
/spec  →  /task  →  /next  →  /done
   ↑         ↑        └── autonomous loop ──┘
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
that proves it. `/done` runs the test command and reads its exit code. An agent
that just wrote the code always believes it works, so its opinion is not the
gate.

**Project state lives in one place.** Task state is the folder a file sits in,
and `docs/status.md` is regenerated from the filesystem, never maintained by
hand. It cannot drift, because nothing has to remember to update it.

**Review runs in a separate context.** An agent reviewing its own work in the
same session confirms its own assumptions, including the wrong ones. The
reviewer subagent is read-only and has not seen the reasoning behind the diff.

## Install

Point your coding agent at the setup guide:

```
Read SETUP.md from https://github.com/<you>/specloop and set this project up.
```

It will detect which agent you are running, ask about five questions, and write
the files in that agent's native format. Or copy a prebuilt folder yourself:

```bash
git clone https://github.com/<you>/specloop /tmp/specloop
cp -r /tmp/specloop/dist/claude-code/. .     # or kilo-code, opencode, cursor, copilot
```

Then commit, and run `/spec` on your next feature.

## The loop

| Command | What it does | Stops for you |
| --- | --- | --- |
| `/spec <idea>` | Interviews you, writes a spec with numbered behaviors | yes, for review |
| `/task <spec>` | Splits it into numbered tasks, each covering behaviors | yes, for review |
| `/next` | Branch, plan, write tests, implement, until tests pass | only if blocked |
| `/done` | Runs checks, merges, archives, refreshes status | only if a check fails |
| `/drop <id> <why>` | Abandons a task and reopens its behaviors | no |
| `/status` | Rebuilds and shows where the project stands | no |

A fresh session runs `/status` and knows what is in progress, what is next, and
what needs a decision.

## What it writes in your project

```
docs/
├── CONTEXT.md          shared vocabulary, stable
├── status.md           generated, never edited by hand
├── adr/                decisions that are expensive to reverse
├── specs/              the contracts
├── tasks/active/       open work, one file per task
└── archive/            finished work, never read by an agent again
```

Plus the commands, skill and subagents in your agent's own configuration folder.
Nothing else. No runtime, no dependency, no lock-in: delete the folder and your
repository is unchanged.

## Agent support

| Agent | Commands | Skill | Subagents | Enforced permissions |
| --- | --- | --- | --- | --- |
| Claude Code | yes | yes | yes | yes |
| Kilo Code | yes | yes | yes | yes |
| opencode | yes | yes | yes | yes |
| Cursor | yes | as a rule | no | no |
| Copilot | as prompts | as instructions | partial | no |
| Other | generated from templates | | | |

Read the last two columns honestly. On Claude Code, Kilo and opencode, "the spec
writer cannot edit source files" is enforced by the tool: it will fail. On Cursor
and Copilot the same line is a convention the model usually follows. The workflow
still works, the guarantees become conventions. The setup guide tells you which
of the two you got.

Not on the list? The setup guide reads your agent's existing configuration
folder, matches the closest format and asks you to confirm before writing.

## Repository layout

```
templates/      neutral source of truth, one file per command, agent and skill
adapters/       how each target maps commands, skills, agents and permissions
dist/           prebuilt folders, generated from templates and adapters
SETUP.md        the installer, written to be executed by an agent
```

Change a template, regenerate `dist/`, every target stays in sync. Never edit
`dist/` by hand.

## Design notes

**Specs and tasks live on the main branch only.** A task archived on a feature
branch is invisible to every other session until that branch merges. `/done`
merges first, then archives.

**Task numbers are scoped to their spec** (`auth-001`), so two features split in
parallel cannot collide.

**Every behavior is numbered and covered.** `/task` reports `n/n` coverage, and
`/drop` reopens the behaviors an abandoned task was carrying. A requirement
cannot disappear silently while the spec still promises it.

**Blocking means three things only**: incorrect behavior against a criterion, a
security hole, possible data loss. Everything else is follow-up. A reviewer that
always finds something teaches you to ignore it.

**Two review passes maximum.** Then the remainder goes to you.

## Not for you if

You ship small changes to a codebase you know by heart. The ceremony costs more
than the mistakes it prevents. Use `/task --adhoc` for those, or nothing at all.

A spec is a checkpoint, not a ritual. If it is not preventing rework, drop it.

## Contributing

Edit `templates/`, run the regeneration described in `adapters/README.md`, and
open a pull request with both the template and the regenerated `dist/`. New
adapters are welcome: one file in `adapters/`, one folder in `dist/`.

## License

MIT
