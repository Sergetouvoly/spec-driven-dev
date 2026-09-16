# SETUP

You are an AI coding agent. This file is a procedure for you to execute, not
documentation for a human to read. Follow it in order.

Your job: install the specloop workflow into the user's project, in the native
format of whatever agent you are running, adapted to how that project actually
works.

**Do not write a single file before phase 4.** Phases 1 to 3 gather facts and
confirm a plan. Installing a workflow the user did not agree to is worse than
installing nothing.

---

## Phase 0. Get the source

You need `templates/` from this repository. If you are not already running
inside a clone:

```bash
git clone --depth 1 https://github.com/Sergetouvoly/spec-driven-dev /tmp/specloop
```

If you cannot run git or reach the network, say so and stop. Do not reconstruct
the templates from memory: you will get the details wrong, and the details are
the whole point.

---

## Phase 1. Detect

Run these and read the results. Do not ask the user anything you can see.

**Which agent am I, and what layout does this project already use?**

```bash
ls -d .claude .kilo .kilocode .opencode .cursor .github/prompts .agents 2>/dev/null
ls AGENTS.md CLAUDE.md .cursorrules 2>/dev/null
```

You know which agent you are. The folders tell you what is already installed and
whether the project is shared by several agents.

**How does this project work?**

```bash
git rev-parse --abbrev-ref HEAD           # default branch name
git log --oneline -20                     # commit message style
ls docs 2>/dev/null                       # is there a docs folder
cat package.json 2>/dev/null | head -40   # or pyproject.toml, Cargo.toml, go.mod, Makefile
ls .github/workflows 2>/dev/null          # does CI exist, what does it run
```

From this, form a first answer to each question in phase 2. You will propose
those answers rather than asking open questions.

---

## Phase 2. Ask

Ask everything in **one message**. Number the questions. Every question carries
your recommended answer and a one-line reason, so the user can reply "all good"
and be done.

Ask only these. Nothing else is worth interrupting for.

1. **Target agent(s).** You detected X. Install for X only, or for several so the
   team can mix tools?
2. **Docs location.** Recommend `docs/`. Propose an alternative only if the
   project already keeps documentation elsewhere.
3. **Integration branch and merge style.** You detected branch `<name>`. Does
   `/done` merge directly, or push and wait for a pull request?
4. **Test command.** You detected `<command>`. This is what `/done` runs to
   decide whether a task is finished. If the project has no test runner, say so:
   the workflow falls back to manual confirmation, and tell the user this is the
   single biggest weakening of the setup.
5. **Optional checks.** `review` is always on. Add `e2e`? Add `pentest`? Only if
   the project has the tooling or the user wants the skill stubs.

If the user does not answer, or says "just do it", proceed with your recommended
answers and list them in the final report as assumptions.

---

## Phase 3. Plan and confirm

Show, in under fifteen lines:

- every file you will create, with its full path
- every existing file you would overwrite, and what it currently is
- which guarantees are enforced and which are only conventions on this target
  (see the degradation table below)

Then wait for a yes.

**Never overwrite without asking.** If `AGENTS.md`, `CLAUDE.md` or a command of
the same name already exists, propose to append or to write alongside, and let
the user choose.

---

## Phase 4. Write

### 4.1 Map to the target

Templates are neutral. Translate each one into the target's format. Layouts, as
last verified:

| Target | Commands | Skills | Subagents | Project rules |
| --- | --- | --- | --- | --- |
| Claude Code | `.claude/commands/<name>.md` | `.claude/skills/<name>/SKILL.md` | `.claude/agents/<name>.md` | `CLAUDE.md` |
| Kilo Code | `.kilo/commands/<name>.md` | `.kilo/skills/<name>/SKILL.md` | `.kilo/agents/<name>.md` | `AGENTS.md` |
| opencode | `.opencode/command/<name>.md` | `.opencode/skills/<name>/SKILL.md` | `.opencode/agent/<name>.md` | `AGENTS.md` |
| Cursor | `.cursor/commands/<name>.md` | `.cursor/rules/<name>.mdc` | not available | `AGENTS.md` |
| Copilot | `.github/prompts/<name>.prompt.md` | `.github/instructions/<name>.instructions.md` | `.github/agents/<name>.md` | `.github/copilot-instructions.md` |

**This table ages.** Before writing, check the folders that already exist in the
project and the target's current documentation. When what you find disagrees
with this table, follow what you find and say so in the report.

For a target not listed: look for an existing configuration folder, ask the user
to confirm the convention, and write the templates as plain markdown with a
`description` frontmatter. Plain markdown is the floor, and every agent can read
it.

### 4.2 Frontmatter

Keep `description` on every command: that is what makes a skill or prompt
discoverable, and it is the highest-value field in the file.

Then translate what the target understands, and **drop what it does not** rather
than inventing a field:

- Claude Code: `argument-hint`, `allowed-tools`, `model`
- Kilo Code: `agent`, `model`; permissions live in the agent file
- opencode: `agent`, `model`; permissions live in the agent file
- Cursor: keep `description` only; `.mdc` rules take `globs` and `alwaysApply`
- Copilot: `mode`, `tools`, `description`; instructions take `applyTo`

Arguments are `$ARGUMENTS` on Claude Code, Kilo and opencode. Where the target
has no substitution, replace the line with "the text the user typed after the
command name".

### 4.3 Degradation, and telling the truth about it

Some targets cannot enforce what the templates assume. Degrade in this order,
and record what you did:

| Template concept | If unsupported | Consequence |
| --- | --- | --- |
| Subagent with its own context | run the review as an explicit fresh session the user starts | review still separate, but manual |
| Read-only permission on the reviewer | write the restriction in the prose of the file | advisory, not enforced |
| `spec-writer` cannot touch source | same, in prose | the model usually complies, nothing stops it |
| Command invocation | a prompt file the user opens | same content, different trigger |

Never silently drop a guarantee. A user who believes the spec writer cannot
touch code, when nothing prevents it, is worse off than one who knows.

### 4.4 Fill in the project's answers

Substitute everywhere the templates use a placeholder: docs path, integration
branch name, merge style in `/done`, test command as the default `verify`,
optional checks in the task template.

### 4.5 Create the project structure

```bash
mkdir -p <docs>/specs <docs>/tasks/active <docs>/archive/tasks <docs>/archive/specs <docs>/adr
```

Write a starter `<docs>/CONTEXT.md` holding only what you learned in phase 1:
stack, entry points, test command, naming conventions actually observed in the
code. Three to fifteen lines. Do not pad it, and do not guess.

Generate `<docs>/status.md` by running the `/status` definition.

Add to the project rules file, appending rather than replacing:

```markdown
## Workflow

Features go through /spec then /task before implementation. See docs/status.md
for the current state. Never read docs/archive/: it is a human trail, not context.
```

---

## Phase 5. Verify

Do not report success on the strength of having written files.

1. List everything you created with its size. A zero-byte file is a failure.
2. Confirm each file landed in a folder the target actually scans.
3. If the target enforces permissions, test one: ask the restricted agent to
   touch a source file and confirm it is refused. **If it succeeds, your
   permissions are decorative.** Say so plainly.
4. Confirm the test command from phase 2 runs.

---

## Phase 6. Report

```
Installed for: <target(s)>
Commands: <list>
Skill: <path>
Subagents: <list, or "not supported on this target">
Docs root: <path>
Verify command: <command>
Enforced: <what the tool actually blocks>
Advisory only: <what is prose the model may ignore>
Assumptions: <anything the user did not confirm>

Next: commit these files, then run /spec on your next feature.
```

Then stop. Do not demonstrate the workflow on a made-up feature, and do not
start writing code. The user chooses the first real one.

---

## If something goes wrong

**The project already has a spec workflow.** Do not merge the two. Show the
overlap, and let the user choose to replace, to install alongside under a
different command prefix, or to stop.

**Several agents share the project.** Install for each, but keep one docs root
and one set of markdown. Only the configuration folders differ.

**The user wants to change the workflow itself.** Point them at `templates/`,
and remind them that `dist/` is generated: editing it there means the next
update silently reverts their change.