'use strict';

// What specloop writes outside the agent folders: a delimited block in the
// project rules file, the docs tree, and starter CONTEXT.md and status.md.

const fs = require('fs');
const path = require('path');

const START = '<!-- specloop:start -->';
const END = '<!-- specloop:end -->';

function rulesBlock(a) {
  const d = a.docs;
  const lines = [
    START,
    '## Workflow',
    '',
    `Features go through /spec then /task before implementation. See ${d}/status.md`,
    'for the current state.',
    '',
    `Specs in ${d}/specs/ are durable and are never archived: a delivered feature`,
    'still has a contract, and /spec edits it in place rather than starting a new one.',
    'Ticked acceptance criteria name the task that delivered them.',
    '',
    `Tasks live in ${d}/tasks/active/<spec-slug>/, one folder per spec, ad-hoc ones`,
    'in adhoc/.',
    '',
    `Never read ${d}/archive/: it holds finished tasks, a human trail rather than`,
    'context.',
    '',
    `- Integration branch: \`${a.branch}\`. Task branches: \`${a.prefix}/<id>-<short-name>\`.`,
    `- /done merges ${a.merge === 'pr' ? 'through a pull request' : 'directly'}.`,
    a.test
      ? `- Test command: \`${a.test}\`. Each task's \`verify\` narrows it to that task.`
      : '- No test command: tasks close on `verify: manual`, a human yes with no exit code behind it. Add a test runner as soon as you can.',
    `- Checks a task may list: ${a.checks.join(', ')}. Any other makes /done stop.`,
    END,
  ];
  return lines.join('\n') + '\n';
}

// Insert or replace the block, never touching the rest of the file.
function withRulesBlock(existing, block) {
  const text = (existing || '').replace(/\r\n/g, '\n');
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start !== -1 && end > start) {
    return text.slice(0, start) + block + text.slice(end + END.length).replace(/^\n/, '');
  }
  if (!text.trim()) return block;
  return text.replace(/\n*$/, '\n\n') + block;
}

// Put specloop's hooks into a Claude Code settings file, or take them out
// (hooks = null). Only entries that run specloop-guard.js are touched.
function withSpecloopHooks(existing, hooks) {
  let settings = {};
  if (existing && existing.trim()) {
    try {
      settings = JSON.parse(existing);
    } catch (error) {
      throw new Error(`.claude/settings.json is not valid JSON (${error.message}). Fix it, then run again: specloop will not rewrite a file it cannot read.`);
    }
  }
  const ours = (group) => (group.hooks || []).some((h) => String(h.command || '').includes('specloop-guard.js'));
  const all = { ...(settings.hooks || {}) };
  for (const event of Object.keys(all)) {
    all[event] = (all[event] || []).filter((group) => !ours(group));
    if (!all[event].length) delete all[event];
  }
  for (const [event, groups] of Object.entries(hooks || {})) {
    all[event] = [...(all[event] || []), ...groups];
  }
  if (Object.keys(all).length) settings.hooks = all;
  else delete settings.hooks;
  return JSON.stringify(settings, null, 2) + '\n';
}

function contextStarter(a, facts) {
  const lines = ['# Context', ''];
  if (facts.stack.length) lines.push(`Stack: ${facts.stack.join(', ')}.`);
  lines.push(a.test ? `Test command: \`${a.test}\`.` : 'Test command: none yet.');
  lines.push(`Integration branch: \`${a.branch}\`.`);
  lines.push('', '<!-- Add the vocabulary of the project here: one line per term, what it means. -->', '');
  lines.push('## Layout', '', '<!-- One line per folder: what it is for. The agent globs the tree; this carries the meaning. -->');
  for (const dir of facts.folders) lines.push(`- \`${dir}/\`:`);
  return lines.join('\n') + '\n';
}

function statusStarter(date) {
  return [
    '# Status',
    '',
    `Updated: ${date}`,
    '',
    '## In progress',
    'nothing, working tree clean',
    '',
    'Active: 0 | Started: 0 | Archived: 0 | Features: 0/0 delivered',
    '',
  ].join('\n');
}

function docsDirs(a) {
  return ['specs', 'tasks/active', 'archive/tasks', 'adr'].map((d) => `${a.docs}/${d}`);
}

function topFolders(cwd) {
  const skip = new Set(['node_modules', 'dist', 'build', 'coverage', 'target', 'vendor', '__pycache__']);
  try {
    return fs.readdirSync(cwd, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !skip.has(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

module.exports = { rulesBlock, withRulesBlock, withSpecloopHooks, contextStarter, statusStarter, docsDirs, topFolders, START, END };
