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

You need the source files from this repository: `commands/`, `agents/` and
`skills/`, all at the root. If you are not already running inside a clone:

```bash
git clone --depth 1 https://github.com/Sergetouvoly/spec-driven-dev /tmp/specloop
```

If you cannot run git or reach the network, say so and stop. Do not reconstruct
the files from memory: you will get the details wrong, and the details are the
whole point.

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
3. **Integration branch, branch prefix and merge style.** You detected branch
   `<name>`. Does `/done` merge directly, or push and wait for a pull request?
   And what prefix should task branches carry? Propose one from the branch names
   already in `git branch -a`, or `task/` if there is no convention. The
   template ships `<branch-prefix>` with no default on purpose: a prefix
   inherited from someone else's tool is the kind of thing nobody notices until
   it is in fifty branch names.
4. **Test command.** You detected `<command>`. This is what `/done` runs to
   decide whether a task is finished. If the project has no test runner, say so:
   the workflow falls back to manual confirmation, and tell the user this is the
   single biggest weakening of the setup.
5. **Optional checks.** `review` is always on. Add `e2e`? Add `pentest`? Each
   one installs a skill and becomes available in a task's `checks`. Recommend
   `e2e` when the project already has an e2e runner, `pentest` when it exposes
   an HTTP surface. A check whose skill is not installed makes `/done` stop, so
   install the two the user says yes to, and neither of the others.

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

`skills/specs/`, `skills/clean-tree/` and `skills/changelog/` are always
installed: the first two are used by `/spec`, `/task` and `/implement`, and the
third is called by `/done` when a feature's last criterion is ticked.
`skills/e2e-tests/` and `skills/pentest/` are installed only if the user said yes
in question 5, and the report says which ones landed.

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

`agent:` is the field that binds a command to the agent whose permissions
constrain it. **Where the target has no such field, do not simply drop it**: the
command then runs unconstrained, and every `deny` in the agent file becomes
decorative for that command. On Claude Code, translate the agent's permissions
into the command's own `allowed-tools`, and say in the report which of the two
you did. `/implement` without `agent: implementer` is a command that can commit,
merge and read the archive.
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
| `agent:` binding a command to an agent | translate the agent's permissions into the command's `allowed-tools` | the boundary holds for that command, not for the agent everywhere |
| `implementer` cannot read `docs/specs/` | same, in prose | the token saving becomes a habit rather than a fact; `/task` must still fill `## Notes` |
| the built-in `explore` subagent, allowed in `task:` for two agents | use the target's own read-only search agent, whatever it is called, and rename it in both agent files | codebase sweeps happen in the main context, and cost it |
| `e2e` / `pentest` skills the user declined | leave both out, and out of `checks` | `/done` stops on a check whose skill is missing, by design |
| Command invocation | a prompt file the user opens | same content, different trigger |

Never silently drop a guarantee. A user who believes the spec writer cannot
touch code, when nothing prevents it, is worse off than one who knows.

### 4.4 Fill in the project's answers

Substitute everywhere the templates use a placeholder: docs path, integration
branch name, merge style in `/done`, test command as the default `verify`,
optional checks in the task template.

Three values are written in plain form throughout the templates rather than as
placeholders, because the sources have to stay readable: the integration branch
(`main`), the docs root (`docs/`), and the branch prefix (`<branch-prefix>` in
the task template, which has no default). **Do not find-and-replace them.**
`main` also appears as an ordinary English word, and `docs/` appears inside
prose that is about documentation in general.

Go file by file instead, and substitute only the references that mean the
branch or the path:

| File | What to substitute |
| --- | --- |
| `commands/task.md` | the `You must be on main` gate, `branch:` and `spec:` in the template, the final commit target |
| `commands/implement.md` | `git switch -c <branch> main`, the diff against `main`, every `docs/` path |
| `commands/done.md` | `git diff main` in A2, the merge and switch in A4, the archive paths in B1 |
| `commands/drop.md` | the switch in section 1, `git log main..<branch>`, the archive path |
| `commands/status.md` | `main` in sections 1 and 2, `docs/` everywhere, the output path |
| `commands/spec.md` | the save path and the context paths |
| `skills/pentest/SKILL.md` | `git diff main` |
| `skills/changelog/SKILL.md` | the `docs/specs/` path it reads the spec from |
| `agents/*.md` | every path in a `permission` block, and the two `git switch`/`git checkout` denies |

Then grep the installed files for the old values and read every hit. A hit
inside prose is fine; a hit inside a command, a path or a permission is one you
missed.

The agent files hold placeholders too, and they are the ones that matter most:
`agents/implementer.md` denies `git switch main` and `git checkout main`. If the
project's integration branch is not `main`, those two lines protect nothing.
Rewrite them with the real name, and do the same for `<docs>` in every
permission path if the docs root is not `docs/`. A permission pointing at a path
that does not exist is the most convincing kind of decorative permission.

### 4.5 Create the project structure

```bash
mkdir -p <docs>/specs <docs>/tasks/active <docs>/archive/tasks <docs>/adr
```

Write a starter `<docs>/CONTEXT.md` holding only what you learned in phase 1:
stack, entry points, test command, naming conventions actually observed in the
code. Three to fifteen lines. Do not pad it, and do not guess.

End it with a `## Layout` section: one line per top-level folder, what it is
for. The agent's `glob` finds the structure whenever it needs it; this section
carries the meaning, which no listing can produce. Keep it to one line each.

Generate `<docs>/status.md` by running the `/status` definition.

### 4.6 Project rules

**Install no hook and no script.** This workflow is markdown and nothing else:
if you find yourself writing a pre-commit hook, copying a shell script, or
adding a dependency, you have gone past the end of this guide. Where code lives
is answered by the agent's own `glob`, on demand and always current.

Add to the project rules file, appending rather than replacing:

```markdown
## Workflow

Features go through /spec then /task before implementation. See docs/status.md
for the current state.

Specs in docs/specs/ are durable and are never archived: a delivered feature
still has a contract, and /spec edits it in place rather than starting a new one.
Ticked acceptance criteria name the task that delivered them.

Never read docs/archive/: it holds finished tasks, a human trail rather than
context.
```

---

## Phase 5. Verify

Do not report success on the strength of having written files.

1. List everything you created with its size. A zero-byte file is a failure.
2. Confirm each file landed in a folder the target actually scans.
3. Test the permissions. Do not assume they work because you wrote them in the
   right shape: run the probes below, one per agent, and record the result of
   each. **A probe that succeeds means that permission is decorative.** Say so
   plainly, by name, in the report.

   | Agent | Ask it to | Expected |
   | --- | --- | --- |
   | `spec-writer` | edit a source file outside `<docs>/` | refused |
   | `spec-writer` | run `npm test` or any non-git command | refused |
   | `reviewer` | write any file at all | refused |
   | `reviewer` | read a file under `<docs>/archive/` | refused |
   | `implementer` | read a file under `<docs>/specs/` | refused |
   | `implementer` | read a file under `<docs>/archive/tasks/` | refused |
   | `implementer` | run `cat <docs>/specs/<any>` | refused |
   | `implementer` | run `grep -r . <docs>/specs/` | refused |
   | `implementer` | run `git cat-file -p <branch>:<docs>/specs/<any>` | refused |
   | `implementer` | run `git grep . <branch> -- <docs>/specs/` | refused |
   | `implementer` | run `cp <docs>/specs/<any> ./notes.txt` | refused |
   | `implementer` | run `git diff` | allowed |
   | `implementer` | run `curl https://example.com` | refused |
   | `implementer` | run `git commit` with no arguments | refused |
   | `implementer` | run `git commit -m "probe"` | refused |
   | `implementer` | run `git switch <integration branch>` | refused |
   | `implementer` | run `git reset --hard` | refused |
   | `implementer` | write to a file under `<docs>/archive/` | refused |
   | `implementer` | run the project's test command | allowed |
   | `spec-writer` | write to a file under `<docs>/archive/tasks/` | refused |
   | `spec-writer` | write to `<docs>/tasks/active/probe.md` | allowed |
   | `spec-writer` | run `git stash push -u -m probe` | allowed |
   | `reviewer` | read a file under `<docs>/specs/` | allowed |
   | `reviewer` | run `git show <integration branch>:<docs>/archive/tasks/<any>` | refused |
   | `reviewer` | run `git log -p <integration branch> -- <docs>/archive/` | refused |
   | `spec-writer` | run `git log -p <integration branch> -- <docs>/archive/` | refused |

   The `git show`, `git log -p`, `git cat-file`, `git grep`, `cat`, `grep` and
   `cp` rows are the ones people skip. A `read` deny means nothing if the same
   agent has a shell command that prints the file — from a revision, straight off
   disk, or by copying it to a path that is not denied and reading it there.
   Probe the bypass, not just the front door. Those rows are why `reviewer` and
   `spec-writer` have no `git log` at all, and why `implementer`, whose shell is
   allow-by-default, denies the *path* in any command (`*<docs>/specs/*`) on top
   of the printers it denies by name.

   **Probe the nested paths, not the top-level one.** In a path glob, `*` stops
   at a slash, so `<docs>/archive/*` does not match
   `<docs>/archive/tasks/auth-001.md` — which is the only place archived tasks
   ever are. Every path permission in the three agent files ends in `**` for that
   reason. If your target's engine uses different semantics, the probe rows above
   are what will tell you, and they are worth running even when the YAML looks
   obviously correct.

   The two `allowed` rows for `spec-writer` writing a task file and `implementer`
   running `git diff` are the same kind of check in the other direction: the
   first is a permission that was `<docs>/*` and silently blocked `/task` from
   writing anything under `<docs>/tasks/active/`, the second is what `/implement`
   needs to resume a branch.

   The two `git commit` rows are not redundant. Most permission engines match
   globs, and `git commit *` does not match `git commit` on its own. The bare
   form is the one that gets through, so it is the one worth probing.

   The two `allowed` rows are the opposite failure: a boundary so tight the
   agent cannot do its job. If the test command is refused, the implementer's
   deny list caught it and the workflow stalls on the first task. If the stash
   is refused, `clean-tree` has nothing left to offer `/spec` and `/task`, and
   every dirty tree becomes a dead end.

4. Confirm the test command from phase 2 runs.

---

## Phase 6. Report

```
Installed for: <target(s)>
Commands: <list>
Skills: <paths, including changelog>
Subagents: <list, or "not supported on this target">
Docs root: <path>
Verify command: <command>
Enforced: <what the tool actually blocks>
Advisory only: <what is prose the model may ignore>
Unbound: /done, /drop, /status run with the main session's own permissions
Probes: <n> of <n> behaved as expected <, and which ones did not>
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

**The user wants to change the workflow itself.** Point them at the source
files in this repository. The copy you install in their project is theirs to
edit, and nothing syncs it back: an improvement worth keeping belongs upstream.