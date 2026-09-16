# Contributing

## The one rule

**Edit `templates/`, run the build, commit both.**

```bash
node scripts/build.mjs
node scripts/check.mjs
git add templates dist
```

`dist/` is generated. A change made there is reverted by the next build, and
until then that one target quietly disagrees with the other four. CI runs
`check.mjs` on every push and pull request, and it fails when `dist/` is not
exactly what the build produces.

## Layout

```
templates/      the source of truth, written in the Kilo Code format
adapters/       one data file per target, see adapters/README.md
scripts/        build.mjs, check.mjs, and a small YAML reader
dist/           generated, never edited by hand
SETUP.md        the installer, written to be executed by an agent
```

There is no install step and no dependency. `node scripts/build.mjs` works on
a clean clone with nothing but Node.

## Changing a command, a skill or an agent

Edit the file under `templates/`, then build and check. The change reaches all
five targets at once, which is the point of the pivot.

Keep `description` non-empty: `check.mjs` rejects a generated file without one,
because a command nobody can discover is a command nobody runs.

## Adding a target

One file in `adapters/`, one folder in `dist/`. The schema and a step-by-step
walkthrough are in [`adapters/README.md`](adapters/README.md).

The build knows no command, agent or target by name. If a target seems to need
a special case in `scripts/`, the templates are probably carrying something
that belongs in an adapter instead.

## Adding a frontmatter field to a template

Every adapter must then sort that field into `keep`, `rename` or `drop`. The
build fails on a field an adapter never mentions, on purpose: a new field
should not silently leak into a target that will ignore it.

If the field carries a guarantee a target cannot enforce, add a `compensate`
sentence so it comes back as prose, and record the loss in that adapter's
`degrades`.

## Honesty about what is enforced

The `enforces`, `advisory` and `degrades` lists in each adapter are the claims
this project makes to its users. Put a guarantee in `enforces` only when the
tool refuses the action at runtime. If the model merely usually complies, it is
`advisory`.

A user who believes the spec writer cannot touch code, when nothing prevents
it, is worse off than one who knows.

## Commits and pull requests

Small, atomic commits with a conventional prefix (`feat:`, `fix:`, `chore:`,
`docs:`). One concern per pull request. Note user-visible changes under
`## [Unreleased]` in `CHANGELOG.md`.

## Before you open a pull request

- [ ] `node scripts/build.mjs && node scripts/check.mjs` passes.
- [ ] `templates/` or `adapters/` changed, and `dist/` was regenerated, not
      hand-edited.
- [ ] The affected adapters still describe what their target really does.
