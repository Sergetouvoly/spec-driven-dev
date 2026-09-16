# Adapters

An adapter is a data file. It says where a target keeps its files, which
frontmatter fields it understands, how it takes arguments, and what it can
actually enforce. It carries no prose instructions for a model and no
per-file special cases: `scripts/build.mjs` is the only thing that reads it.

`templates/` is written in the Kilo Code format. That is the pivot. Every
adapter describes a transform from the pivot to one target, and
`kilo-code.yml` is the identity transform.

```
templates/ ──┬── kilo-code.yml  ──► dist/kilo-code/
             ├── claude-code.yml ──► dist/claude-code/
             └── ...
```

Add a file, run `node scripts/build.mjs`, and a new target exists. No code
changes.

## Schema

### `id`, `name`, `pivot`, `dist`

`id` is the filename without `.yml` and the folder name under `dist/`. `name`
is what a human calls the target. `pivot` is true for exactly one adapter.
`dist` is the output root.

### `paths`

One template per artefact type. `{name}` is the file basename, or the
directory name for a skill.

```yaml
paths:
  commands: .claude/commands/{name}.md
  skills: .claude/skills/{name}/SKILL.md
  agents: .claude/agents/{name}.md
  rules: CLAUDE.md
```

`rules` is the project-level instructions file. The build does not write it;
`SETUP.md` appends to it in the user's own project, because it usually already
exists there.

Two types may share a path template. Cursor has no subagent, so its agents are
written as commands.

### `arguments`

```yaml
arguments:
  syntax: $ARGUMENTS      # or null
  fallback: the text the user typed after the command name
```

Where `syntax` is null, every `$ARGUMENTS` in a body is replaced by
`fallback`. Never leave a substitution token a target cannot expand: the model
reads it literally and asks for a file called `$ARGUMENTS`.

### `frontmatter`

One block per artefact type, applied in this order:

| Key | Effect |
| --- | --- |
| `keep` | fields copied through, in this order; anything absent from the source is skipped |
| `rename` | `from: to`, applied before `keep` is matched |
| `drop` | fields removed, listed explicitly so the loss is visible in the diff |
| `add` | fields the target requires, values may use `{name}` |
| `compensate` | a dropped field to a sentence appended to the body |

`compensate` is the honesty rule. A field the target cannot express does not
vanish quietly: it comes back as a line under `## On this target`, so the
reader learns the guarantee is now a convention. `{value}` is the dropped
field's value.

```yaml
compensate:
  agent: Follow the rules of the `{value}` agent in `.claude/agents/{value}.md`.
```

A field in `drop` with no `compensate` entry is a field that carried nothing
worth saying. A field in neither `keep` nor `drop` is an error: the build
fails rather than guess.

### `supported_extras`

Fields the target accepts that the templates do not set. Documentation for the
next author, so nobody invents a field the target will ignore.

### `permissions`

```yaml
permissions:
  model: action-map | tool-allowlist | none
  field: permission       # frontmatter key that carries it, null if none
  location: agent         # which file it lives in
  enforced: true
  granularity: path | tool | null
  tool_map: {read: Read, ...}   # required by tool-allowlist, null otherwise
```

- `action-map` copies the pivot block unchanged.
- `tool-allowlist` emits, for each pivot action with at least one `allow`, the
  tool named in `tool_map`. A whole-tool allow is wider than a path-scoped one,
  so say so in `degrades`.
- `none` drops the block entirely and relies on `compensate`.

### `enforces`, `advisory`, `degrades`

The claims `SETUP.md` reports back to the user, as data rather than a table
someone forgets to update.

Put a guarantee in `enforces` only if the tool refuses the action at runtime.
If the model merely usually complies, it is `advisory`. Guessing generously
here is the one failure this repository cares most about: a user who believes
the spec writer cannot touch code, when nothing prevents it, is worse off than
one who knows.

`degrades` is a list of `{concept, action, consequence}` for every template
concept the target cannot carry.

## Writing a new adapter

1. Copy `kilo-code.yml`. It is the shape with nothing removed.
2. Fill `paths` from the target's current documentation, not from memory.
3. For each frontmatter block, sort every pivot field into `keep`, `rename`
   or `drop`. The build fails on a field you forgot.
4. Add a `compensate` line for each dropped field that carried a guarantee.
5. Set `permissions`, then fill `enforces` and `advisory` honestly.
6. `node scripts/build.mjs && node scripts/check.mjs`, then read the generated
   files. Check that a reader who only ever sees `dist/<id>/` knows what is
   enforced.
7. Commit `adapters/<id>.yml` and `dist/<id>/` together.

## Rules

- An adapter holds data, never instructions for a model.
- No conditionals on a specific filename. If one target needs a per-file
  exception, the templates are wrong, not the adapter.
- `dist/` is generated. Editing it there means the next build reverts it.
