# specloop

[![npm](https://img.shields.io/npm/v/@sergetouvoly/specloop)](https://www.npmjs.com/package/@sergetouvoly/specloop)
[![license](https://img.shields.io/npm/l/@sergetouvoly/specloop)](LICENSE)

A spec-driven workflow for AI coding agents: six commands, five skills, three
subagents. You approve the contract and the breakdown; the agent does the rest.

```
/spec  →  /task  →  /implement  →  /done
   ↑         ↑          └── autonomous loop ──┘
   └─ you ───┘
```

## Install

Needs Node 18+ and a git repository.

```bash
npx @sergetouvoly/specloop init
```

Six questions, each with a detected default: which agents, docs folder, branch
and merge style, test command, optional checks (`e2e`, `pentest`), and the
Claude Code guard hook. It shows every file before writing and never overwrites
yours. Then commit, and run `/spec` on your next feature.

Update, keeping your local edits (three-way merge):

```bash
npx @sergetouvoly/specloop@latest update
```

Cursor, Copilot or another agent: ask it to follow
[SETUP.md](SETUP.md), which does the same install by hand.

## The loop

| Command | What it does | Stops for you |
| --- | --- | --- |
| `/spec <idea>` | Interviews you, writes a spec with numbered behaviors | yes, for review |
| `/task <spec>` | Splits it into tasks, each covering behaviors | yes, after committing them |
| `/implement` | Branch, plan, tests first, implement until tests pass | only if blocked |
| `/done` | Runs checks, merges, ticks the spec, archives | only if a check fails |
| `/drop <id> <why>` | Abandons a task and reopens its behaviors | no |
| `/status` | Shows where the project stands | no |

## Why it holds up

- **Tests are the gate, not checkboxes.** Each criterion names the test that
  proves it; `/done` reads the exit code. No test runner means `verify: manual`,
  and the workflow says so every time.
- **Specs are durable, tasks are disposable.** A spec is never archived: `/done`
  ticks the criterion a task proved and writes the task id next to it. The
  unticked ones are exactly what is left to build. No index file to maintain.
- **Review runs in a separate context.** A read-only reviewer that never saw the
  reasoning behind the diff. Blocking means three things only: wrong behavior,
  a security hole, data loss.
- **Permissions are enforced, not suggested.** Each agent gets the boundary its
  job needs:

| | spec-writer | implementer | reviewer |
| --- | --- | --- | --- |
| reads | all but the archive | all but specs and the archive | all but the archive |
| writes | `docs/` only | code only | nothing |
| commits | `docs/` only | never | never |

The implementer never reads the spec: `/task` copies the criteria into each task,
so the spec is read once per feature instead of once per task.

## What it writes

```
docs/
├── specs/                 contracts, all in one folder, never archived
├── tasks/<spec>/          open work, one folder per spec
├── archive/tasks/<spec>/  finished work, one folder per spec, never read by an agent
├── reference/
│   ├── CONTEXT.md         vocabulary and layout
│   └── adr/               expensive decisions
└── workflow/
    └── status.md          generated, never edited by hand
CHANGELOG.md               one line per delivered feature
```

Plus the commands, skills and agents in `.claude/`, `.opencode/` or `.kilo/`, a
Workflow block in `CLAUDE.md` / `AGENTS.md`, and `.specloop/` (your answers and
the baseline for updates).

Projects installed with an earlier version keep `CONTEXT.md`, `adr/` and
`status.md` at the docs root and open tasks in `tasks/active/`; `update` moves
them with `git mv`, and leaves both in place if the new location already holds
something.

## Agent support

| Agent | Installed by | Permissions |
| --- | --- | --- |
| opencode, Kilo Code | `npx` | enforced by the agent |
| Claude Code | `npx` | enforced by the guard hook, advisory without it |
| Cursor, Copilot, others | SETUP.md | advisory |

Claude Code cannot hold per-agent rules in an agent file, so the optional guard
(`.claude/hooks/specloop-guard.js`) applies them: `/spec` and `/task` switch the
spec writer's rules on, `/implement` the implementer's, until you type another
slash command. It only ever blocks, and it is the one piece of code that runs in
your project.

## Not for you if

You ship small changes to a codebase you know by heart. Use `/task --adhoc` for
those, or nothing at all. A spec is a checkpoint, not a ritual.

## Contributing

Sources live in `commands/`, `agents/` and `skills/`; the CLI in `bin/` and
`lib/`. Run `npm test`, open a pull request. To release: bump `version`, commit,
`npm publish`.

## License

MIT
