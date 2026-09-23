'use strict';

// Loads the neutral sources and fills in the project's answers.
//
// The sources stay readable: they say `main`, `docs/` and `<branch-prefix>`
// in plain form. That is only safe to substitute because of two invariants the
// tests enforce: `main` appears only inside code (inline spans, fences, the
// frontmatter), never as an English word, and every `docs/` is a path.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const COMMANDS = ['spec', 'task', 'implement', 'done', 'drop', 'status'];
const AGENTS = ['spec-writer', 'implementer', 'reviewer'];
const CORE_SKILLS = ['specs', 'clean-tree', 'changelog'];
const OPTIONAL_SKILLS = { e2e: 'e2e-tests', pentest: 'pentest' };

const MERGE_ANCHOR = 'Then merge into `main`:';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

// Replace a whole-word `main` inside code only: the frontmatter, fenced blocks
// and inline spans. Prose is left alone.
function replaceBranch(text, branch) {
  if (branch === 'main') return text;
  const word = (s) => s.replace(/\bmain\b/g, branch);
  const fm = /^---\n[\s\S]*?\n---\n/.exec(text);
  let head = '';
  let body = text;
  if (fm) {
    head = word(fm[0]);
    body = text.slice(fm[0].length);
  }
  body = body.replace(/```[\s\S]*?```|`[^`\n]*`/g, word);
  return head + body;
}

function replaceDocs(text, docs) {
  if (docs === 'docs') return text;
  return text.replace(/(?<![\w./-])docs\//g, `${docs}/`);
}

function mergeNote(merge) {
  return merge === 'pr'
    ? 'This project merges by **pull request**. Follow the `pull request` bullet only.'
    : 'This project merges **directly**. Follow the `direct` bullet only.';
}

function substitute(text, answers) {
  let out = text;
  if (out.includes(MERGE_ANCHOR)) {
    out = out.replace(MERGE_ANCHOR, `${MERGE_ANCHOR}\n\n${mergeNote(answers.merge)}\n`);
  }
  out = out.replace(/<branch-prefix>/g, answers.prefix);
  out = replaceBranch(out, answers.branch);
  out = replaceDocs(out, answers.docs);
  return out;
}

function skillsFor(answers) {
  const optional = (answers.checks || [])
    .filter((c) => OPTIONAL_SKILLS[c])
    .map((c) => OPTIONAL_SKILLS[c]);
  return [...CORE_SKILLS, ...optional];
}

// Everything a renderer needs, already substituted.
function load(answers) {
  const pick = (dir, names, file = (n) => `${n}.md`) =>
    names.map((name) => ({ name, text: substitute(read(`${dir}/${file(name)}`), answers) }));
  return {
    commands: pick('commands', COMMANDS),
    agents: pick('agents', AGENTS),
    skills: pick('skills', skillsFor(answers), (n) => `${n}/SKILL.md`),
  };
}

module.exports = {
  load, substitute, replaceBranch, replaceDocs, read, skillsFor,
  COMMANDS, AGENTS, CORE_SKILLS, OPTIONAL_SKILLS, MERGE_ANCHOR, ROOT,
};
