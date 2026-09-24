'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const sources = require('../lib/sources');
const fm = require('../lib/frontmatter');
const project = require('../lib/project');
const install = require('../lib/install');
const probes = require('../lib/probes');
const { TARGETS, claudeSettingsHooks } = require('../lib/targets');
const { splitCommands, evaluate } = require('../lib/templates/specloop-guard');

const DEFAULTS = {
  targets: ['claude', 'opencode', 'kilo'], docs: 'docs', branch: 'main', merge: 'direct',
  prefix: 'task', test: 'npm test', checks: ['review', 'e2e', 'pentest'], guard: true,
};
const CUSTOM = { ...DEFAULTS, docs: 'documentation', branch: 'trunk', merge: 'pr', prefix: 'feat', test: 'make test' };

function allSourceFiles() {
  const files = [];
  for (const c of sources.COMMANDS) files.push(`commands/${c}.md`);
  for (const a of sources.AGENTS) files.push(`agents/${a}.md`);
  for (const s of [...sources.CORE_SKILLS, ...Object.values(sources.OPTIONAL_SKILLS)]) files.push(`skills/${s}/SKILL.md`);
  return files;
}

function permissionRules(answers) {
  const src = sources.load(answers);
  return Object.fromEntries(src.agents.map((a) => [a.name, fm.split(a.text).data.permission]));
}

// The substitution is only safe while these two invariants hold.
test('sources: `main` appears only in code, never as a word in prose', () => {
  for (const file of allSourceFiles()) {
    const { body } = fm.split(sources.read(file));
    const prose = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
    assert.doesNotMatch(prose, /\bmain\b/, `${file} uses "main" in prose; put it in backticks or reword`);
  }
});

test('sources: every docs/ is substituted, and nothing else changes', () => {
  for (const file of allSourceFiles()) {
    const text = sources.read(file);
    const out = sources.replaceDocs(text, 'documentation');
    assert.doesNotMatch(out, /(?<![\w./-])docs\//, file);
    assert.equal(out.replace(/documentation\//g, 'docs/'), text, file);
  }
});

test('sources: the merge anchor still exists in /done', () => {
  assert.ok(sources.read('commands/done.md').includes(sources.MERGE_ANCHOR));
});

test('substitute: branch in code only, prefix, docs, merge note', () => {
  const done = sources.substitute(sources.read('commands/done.md'), CUSTOM);
  assert.match(done, /`git diff trunk`/);
  assert.doesNotMatch(done, /`git diff main`/);
  assert.match(done, /merges by \*\*pull request\*\*/);
  assert.match(done, /documentation\/archive\/tasks/);
  const task = sources.substitute(sources.read('commands/task.md'), CUSTOM);
  assert.match(task, /branch: feat\/<id>-<short-name>/);
});

test('frontmatter: agent permissions parse as ordered maps', () => {
  const { data } = fm.split(sources.read('agents/implementer.md'));
  assert.equal(data.mode, 'primary');
  assert.equal(data.permission.bash['git commit'], 'deny');
  assert.equal(Object.keys(data.permission.bash)[0], '*');
  assert.equal(data.permission.task['*'], 'deny');
});

for (const [label, answers] of [['default', DEFAULTS], ['custom', CUSTOM]]) {
  test(`probes: every permission probe holds (${label} answers)`, () => {
    const failed = probes.run(permissionRules(answers), answers).filter((r) => !r.ok);
    assert.deepEqual(failed, []);
  });
}

test('guard: compound commands are judged part by part', () => {
  assert.deepEqual(splitCommands('cd src && cat "a && b" | head; ls'), ['cd src', 'cat "a && b"', 'head', 'ls']);
  const rules = permissionRules(DEFAULTS);
  assert.equal(evaluate(rules.implementer, 'Bash', { command: 'npm test && git commit -m x' }, '/p'), 'deny');
  assert.equal(evaluate(rules.implementer, 'Bash', { command: 'npm test && git status' }, '/p'), 'allow');
});

test('guard: a path that climbs back into a denied folder is still denied', () => {
  const rules = permissionRules(DEFAULTS);
  assert.equal(evaluate(rules.implementer, 'Read', { file_path: '/p/src/../docs/specs/a.md' }, '/p'), 'deny');
});

function installHooks(answers = DEFAULTS) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'specloop-guard-'));
  for (const f of TARGETS.claude.render(sources.load(answers), answers).filter((f) => f.path.startsWith('.claude/hooks/'))) {
    fs.mkdirSync(path.join(dir, path.dirname(f.path)), { recursive: true });
    fs.writeFileSync(path.join(dir, f.path), f.content);
  }
  const run = (args, call) => {
    try {
      execFileSync(process.execPath, [path.join(dir, '.claude/hooks/specloop-guard.js'), ...args], {
        input: JSON.stringify({ session_id: 's1', ...call }),
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return 0;
    } catch (error) {
      return error.status;
    }
  };
  return { dir, run, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test('guard: a subagent hook applies that agent, exit 2 blocks, exit 0 passes', () => {
  const { dir, run, cleanup } = installHooks();
  const read = (p) => ({ tool_name: 'Read', tool_input: { file_path: path.join(dir, ...p.split('/')) } });
  assert.equal(run(['agent', 'implementer'], read('docs/specs/a.md')), 2);
  assert.equal(run(['agent', 'implementer'], read('src/a.js')), 0);
  assert.equal(run(['agent', 'reviewer'], { tool_name: 'Bash', tool_input: { command: 'npm install' } }), 2);
  assert.equal(run(['agent', 'nobody'], read('src/a.js')), 2);
  assert.equal(run(['bogus'], read('src/a.js')), 2);
  cleanup();
});

test('guard: the typed command decides which rules apply, and only the user switches', () => {
  const { dir, run, cleanup } = installHooks();
  const specs = { tool_name: 'Read', tool_input: { file_path: path.join(dir, 'docs', 'specs', 'a.md') } };
  const src = { tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'src', 'a.js') } };
  const prompt = (text) => run(['prompt'], { prompt: text });

  assert.equal(run(['pre'], specs), 0, 'no command typed yet: no agent, no rules');
  prompt('/implement auth-001');
  assert.equal(run(['pre'], specs), 2, 'implementer cannot read specs');
  assert.equal(run(['pre'], src), 0, 'implementer edits code');
  prompt('yes, go on');
  assert.equal(run(['pre'], specs), 2, 'a plain message keeps the agent');
  assert.equal(run(['pre'], { tool_name: 'Skill', tool_input: { skill: 'status' } }), 2, 'the agent cannot clear itself');
  assert.equal(run(['pre'], { tool_name: 'Skill', tool_input: { skill: 'spec' } }), 2, 'nor switch itself');
  assert.equal(run(['pre'], { tool_name: 'Skill', tool_input: { skill: 'clean-tree' } }), 0, 'ordinary skills still run');
  prompt('/spec an idea');
  assert.equal(run(['pre'], specs), 0, 'spec-writer reads specs');
  assert.equal(run(['pre'], src), 2, 'spec-writer cannot edit code');
  prompt('/done');
  assert.equal(run(['pre'], src), 0, '/done runs with the session permissions');
  assert.equal(run(['pre'], { tool_name: 'Skill', tool_input: { skill: 'implement' } }), 0, 'with no agent, the model may start one');
  assert.equal(run(['pre'], specs), 2, 'and its rules then apply');
  cleanup();
});

test('claude: commands bound to an agent carry its role, the reviewer its own hook', () => {
  const files = Object.fromEntries(TARGETS.claude.render(sources.load(DEFAULTS), DEFAULTS).map((f) => [f.path, f.content]));
  const implement = files['.claude/commands/implement.md'];
  assert.match(implement, /# Your role for this command: implementer/);
  assert.doesNotMatch(implement, /hooks:/, 'a command hook would outlive the command');
  assert.match(files['.claude/agents/reviewer.md'], /specloop-guard\.js\\" agent reviewer/);
  assert.match(files['.claude/agents/reviewer.md'], /^tools: Read, Glob, Grep, Bash$/m);
  assert.equal(files['.claude/agents/implementer.md'], undefined);
  assert.equal(fm.split(implement).data['argument-hint'], '[task id | spec slug]');
  const rules = JSON.parse(files['.claude/hooks/specloop-permissions.json']);
  assert.deepEqual(rules.commands, { spec: 'spec-writer', task: 'spec-writer', implement: 'implementer', done: null, drop: null, status: null });
});

test('claude settings: specloop hooks added, the user\'s kept, removable', () => {
  const mine = { permissions: { deny: ['Read(.env)'] }, hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'my-check' }] }] } };
  const added = JSON.parse(project.withSpecloopHooks(JSON.stringify(mine), claudeSettingsHooks()));
  assert.deepEqual(added.permissions, mine.permissions);
  assert.equal(added.hooks.PreToolUse.length, 2);
  assert.equal(added.hooks.UserPromptSubmit.length, 1);
  const again = JSON.parse(project.withSpecloopHooks(JSON.stringify(added), claudeSettingsHooks()));
  assert.deepEqual(again, added, 'idempotent');
  const removed = JSON.parse(project.withSpecloopHooks(JSON.stringify(added), null));
  assert.deepEqual(removed, mine);
  assert.throws(() => project.withSpecloopHooks('{ nope', null), /not valid JSON/);
});

test('claude: without the guard, no hook is written anywhere', () => {
  const answers = { ...DEFAULTS, guard: false };
  const files = TARGETS.claude.render(sources.load(answers), answers);
  assert.ok(files.every((f) => !/hooks/.test(f.path) && !/specloop-guard/.test(f.content)));
});

test('opencode and kilo: sources land unchanged but for the answers', () => {
  const src = sources.load(DEFAULTS);
  for (const t of ['opencode', 'kilo']) {
    const files = TARGETS[t].render(src, DEFAULTS);
    const agent = files.find((f) => f.path === `${TARGETS[t].dir}/agents/implementer.md`);
    assert.equal(agent.content, sources.read('agents/implementer.md'));
    assert.ok(files.some((f) => f.path === `${TARGETS[t].dir}/skills/e2e-tests/SKILL.md`));
  }
});

test('skills: optional checks install only when chosen', () => {
  assert.deepEqual(sources.skillsFor({ checks: ['review'] }), ['specs', 'clean-tree', 'changelog']);
  assert.deepEqual(sources.skillsFor({ checks: ['review', 'pentest'] }), ['specs', 'clean-tree', 'changelog', 'pentest']);
});

test('rules block: appended once, replaced in place, the rest untouched', () => {
  const block = project.rulesBlock(DEFAULTS);
  const once = project.withRulesBlock('# My project\n\nOwn rules.\n', block);
  const twice = project.withRulesBlock(once, project.rulesBlock(CUSTOM));
  assert.match(twice, /^# My project\n\nOwn rules\.\n\n<!-- specloop:start -->/);
  assert.equal(twice.split(project.START).length, 2);
  assert.match(twice, /`trunk`/);
  assert.doesNotMatch(twice, /`main`/);
});

function gitRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'specloop-proj-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

test('init then update: local edits survive, upstream changes arrive', () => {
  const dir = gitRepo();
  const answers = { ...DEFAULTS, targets: ['claude'] };
  const p = install.plan(dir, answers);
  install.apply(dir, answers, p, { overwrite: false, version: '0.0.1', date: '2026-01-01', facts: { stack: [] } });

  const rel = '.claude/commands/status.md';
  const file = path.join(dir, rel);
  const base = path.join(dir, install.BASE, rel);
  // You add a line at the end.
  fs.appendFileSync(file, '\nLocal note kept by the user.\n');
  // Pretend the old version generated a different first heading.
  fs.writeFileSync(base, fs.readFileSync(base, 'utf8').replace('# /status', '# /status (old)'));
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('# /status', '# /status (old)'));

  const report = install.update(dir, install.loadState(dir), '0.0.2');
  const merged = fs.readFileSync(file, 'utf8');
  assert.deepEqual(report.merged, [rel]);
  assert.match(merged, /^# \/status$/m);
  assert.match(merged, /Local note kept by the user\./);
  assert.equal(install.loadState(dir).version, '0.0.2');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('init: specs and tasks at the docs root, the rest under reference/ and workflow/', () => {
  const dir = gitRepo();
  const answers = { ...DEFAULTS, targets: ['claude'] };
  install.apply(dir, answers, install.plan(dir, answers), { overwrite: false, version: '0.0.1', date: '2026-01-01', facts: { stack: [] } });
  for (const rel of ['docs/specs', 'docs/tasks', 'docs/archive/tasks', 'docs/reference/adr', 'docs/reference/CONTEXT.md', 'docs/workflow/status.md']) {
    assert.ok(fs.existsSync(path.join(dir, rel)), rel);
  }
  for (const rel of ['docs/CONTEXT.md', 'docs/status.md', 'docs/adr']) assert.ok(!fs.existsSync(path.join(dir, rel)), rel);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('update: the earlier docs layout is moved with git mv, never over something', () => {
  const dir = gitRepo();
  const answers = { ...DEFAULTS, targets: ['claude'] };
  install.apply(dir, answers, install.plan(dir, answers), { overwrite: false, version: '0.0.1', date: '2026-01-01', facts: { stack: [] } });
  // Put the project back in the earlier layout, tracked by git.
  fs.renameSync(path.join(dir, 'docs/reference/CONTEXT.md'), path.join(dir, 'docs/CONTEXT.md'));
  fs.mkdirSync(path.join(dir, 'docs/adr'));
  fs.writeFileSync(path.join(dir, 'docs/adr/0001-storage.md'), '# Storage\n');
  fs.rmSync(path.join(dir, 'docs/reference/adr'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/status.md'), '# Old status\n');
  fs.mkdirSync(path.join(dir, 'docs/tasks/active/auth'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/tasks/active/auth/auth-001-login.md'), '# auth-001\n');
  execFileSync('git', ['add', 'docs'], { cwd: dir });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'old layout'], { cwd: dir });

  const report = install.update(dir, install.loadState(dir), '0.0.2');
  assert.deepEqual(report.moved, [
    'docs/CONTEXT.md -> docs/reference/CONTEXT.md',
    'docs/adr -> docs/reference/adr',
    'docs/tasks/active/auth -> docs/tasks/auth',
  ]);
  assert.ok(fs.existsSync(path.join(dir, 'docs/tasks/auth/auth-001-login.md')));
  assert.ok(!fs.existsSync(path.join(dir, 'docs/tasks/active')));
  assert.deepEqual(report.blocked, ['docs/status.md (docs/workflow/status.md already exists)']);
  assert.ok(fs.existsSync(path.join(dir, 'docs/reference/adr/0001-storage.md')));
  assert.equal(fs.readFileSync(path.join(dir, 'docs/status.md'), 'utf8'), '# Old status\n');
  const staged = execFileSync('git', ['diff', '--cached', '--name-status', '-M'], { cwd: dir, encoding: 'utf8' });
  assert.match(staged, /^R\d*\tdocs\/adr\/0001-storage\.md\tdocs\/reference\/adr\/0001-storage\.md$/m);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('update: a clash between your edit and upstream is reported, not guessed', () => {
  const dir = gitRepo();
  const answers = { ...DEFAULTS, targets: ['opencode'] };
  install.apply(dir, answers, install.plan(dir, answers), { overwrite: false, version: '0.0.1', date: '2026-01-01', facts: { stack: [] } });
  const rel = '.opencode/commands/drop.md';
  const file = path.join(dir, rel);
  const base = path.join(dir, install.BASE, rel);
  fs.writeFileSync(base, fs.readFileSync(base, 'utf8').replace('# /drop', '# /drop old'));
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('# /drop', '# /drop mine'));
  const report = install.update(dir, install.loadState(dir), '0.0.2');
  assert.deepEqual(report.conflicted, [rel]);
  assert.match(fs.readFileSync(file, 'utf8'), /<<<<<<< yours/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('init never overwrites a file that already exists unless told to', () => {
  const dir = gitRepo();
  const answers = { ...DEFAULTS, targets: ['kilo'] };
  fs.mkdirSync(path.join(dir, '.kilo/commands'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.kilo/commands/spec.md'), 'mine\n');
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Rules\n');
  const p = install.plan(dir, answers);
  assert.deepEqual(p.conflicts, ['.kilo/commands/spec.md']);
  const result = install.apply(dir, answers, p, { overwrite: false, version: '0.0.1', date: '2026-01-01', facts: { stack: [] } });
  assert.deepEqual(result.skipped, ['.kilo/commands/spec.md']);
  assert.equal(fs.readFileSync(path.join(dir, '.kilo/commands/spec.md'), 'utf8'), 'mine\n');
  assert.match(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), /^# Rules\n\n<!-- specloop:start -->/);
  fs.rmSync(dir, { recursive: true, force: true });
});
