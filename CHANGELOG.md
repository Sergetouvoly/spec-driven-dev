# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-16

### Added

- Six commands as templates: `/spec`, `/task`, `/next`, `/done`, `/drop` and
  `/status`.
- The `specs` skill, which owns the gears, the interview and the spec template.
- Two subagents: `spec-writer`, which cannot touch source files, and
  `reviewer`, which is read-only and runs in its own context.
- Adapters for five targets: Kilo Code, Claude Code, opencode, Cursor and
  Copilot. Each declares its paths, frontmatter mapping, argument syntax and
  what it can actually enforce.
- `scripts/build.mjs`, which generates `dist/<agent>/` from `templates/` and
  `adapters/`, and `scripts/check.mjs`, which fails when `dist/` diverges or a
  generated file has no description.
- `SETUP.md`, a procedure a coding agent executes to install the workflow into
  a project in that agent's native format.
- CI running the check on every push and pull request.

[Unreleased]: https://github.com/Sergetouvoly/spec-driven-dev/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Sergetouvoly/spec-driven-dev/releases/tag/v0.1.0
