'use strict';

// The permission probes from SETUP.md phase 5, as data. The CLI evaluates them
// against the rules it just installed, with the guard's own matcher.
//
// What this proves is that the rules say what they should, after substitution.
// On Claude Code with the guard, those rules are what runs. On opencode and
// Kilo, the agent's own engine applies them; SETUP.md phase 5 is how you probe
// that engine live.

const { evaluate } = require('./templates/specloop-guard');

function probes(a) {
  const d = a.docs;
  const b = a.branch;
  const refused = 'deny';
  return [
    ['spec-writer', 'Edit', { file_path: 'src/index.js' }, refused],
    ['spec-writer', 'Bash', { command: 'npm test' }, refused],
    ['spec-writer', 'Edit', { file_path: `${d}/tasks/active/probe/probe.md` }, 'allow'],
    ['spec-writer', 'Edit', { file_path: `${d}/archive/tasks/probe/probe.md` }, refused],
    ['spec-writer', 'Read', { file_path: `${d}/archive/tasks/probe/probe.md` }, refused],
    ['spec-writer', 'Bash', { command: `git log -p ${b} -- ${d}/archive/` }, refused],
    ['spec-writer', 'Bash', { command: 'git stash push -u -m probe' }, 'allow'],
    ['spec-writer', 'Agent', { subagent_type: 'Explore' }, 'allow'],
    ['spec-writer', 'Agent', { subagent_type: 'general-purpose' }, refused],
    ['reviewer', 'Write', { file_path: 'src/index.js' }, refused],
    ['reviewer', 'Read', { file_path: `${d}/archive/tasks/probe/probe.md` }, refused],
    ['reviewer', 'Read', { file_path: `${d}/specs/probe.md` }, 'allow'],
    ['reviewer', 'Bash', { command: 'git diff' }, 'allow'],
    ['reviewer', 'Bash', { command: `git show ${b}:${d}/archive/tasks/probe/probe.md` }, refused],
    ['reviewer', 'Bash', { command: `git log -p ${b} -- ${d}/archive/` }, refused],
    ['reviewer', 'Bash', { command: `git diff ${b} -- ${d}/archive/` }, refused],
    ['implementer', 'Read', { file_path: `${d}/specs/probe.md` }, refused],
    ['implementer', 'Read', { file_path: `${d}/archive/tasks/probe/probe.md` }, refused],
    ['implementer', 'Bash', { command: `cat ${d}/specs/probe.md` }, refused],
    ['implementer', 'Bash', { command: `grep -r . ${d}/specs/` }, refused],
    ['implementer', 'Bash', { command: `git cat-file -p HEAD:${d}/specs/probe.md` }, refused],
    ['implementer', 'Bash', { command: `cp ${d}/specs/probe.md ./notes.txt` }, refused],
    ['implementer', 'Bash', { command: `cd src && cat ../${d}/specs/probe.md` }, refused],
    ['implementer', 'Bash', { command: 'git diff' }, 'allow'],
    ['implementer', 'Bash', { command: 'curl https://example.com' }, refused],
    ['implementer', 'Bash', { command: 'git commit' }, refused],
    ['implementer', 'Bash', { command: 'git commit -m "probe"' }, refused],
    ['implementer', 'Bash', { command: `git switch ${b}` }, refused],
    ['implementer', 'Bash', { command: 'git reset --hard' }, refused],
    ['implementer', 'Edit', { file_path: `${d}/archive/tasks/probe/probe.md` }, refused],
    ['implementer', 'Edit', { file_path: `${d}/specs/probe.md` }, refused],
    ['implementer', 'Edit', { file_path: `${d}/reference/adr/probe.md` }, refused],
    ['implementer', 'Edit', { file_path: 'src/index.js' }, 'allow'],
    ['implementer', 'Agent', { subagent_type: 'Explore' }, refused],
    ...(a.test ? [['implementer', 'Bash', { command: a.test }, 'allow']] : []),
  ].map(([agent, tool, input, expect]) => ({ agent, tool, input, expect }));
}

function run(rules, answers) {
  const root = '/project';
  return probes(answers).map((p) => {
    const input = { ...p.input };
    if (input.file_path) input.file_path = `${root}/${input.file_path}`;
    const got = evaluate(rules[p.agent], p.tool, input, root) || 'no rule';
    const ok = p.expect === 'deny' ? got === 'deny' : got !== 'deny';
    return { ...p, got, ok };
  });
}

module.exports = { probes, run };
