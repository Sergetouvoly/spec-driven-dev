'use strict';

// init and update. Every generated file is also kept, as generated, under
// .specloop/base/. That copy is what makes an update safe: a three-way merge
// between what was generated, what is on disk now, and what the new version
// generates keeps every local edit and only brings in upstream changes.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const sources = require('./sources');
const project = require('./project');
const { TARGETS, claudeSettingsHooks } = require('./targets');
const fm = require('./frontmatter');
const probes = require('./probes');

const STATE_DIR = '.specloop';
const CONFIG = `${STATE_DIR}/config.json`;
const BASE = `${STATE_DIR}/base`;

function readFile(cwd, rel) {
  try {
    return fs.readFileSync(path.join(cwd, rel), 'utf8').replace(/\r\n/g, '\n');
  } catch {
    return null;
  }
}

function writeFile(cwd, rel, content) {
  const abs = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function removeFile(cwd, rel) {
  fs.rmSync(path.join(cwd, rel), { force: true });
}

// All generated files for these answers: agent folders, then rules files.
// Rules files are not in this list: they hold a block, not a whole file.
function generate(answers) {
  const src = sources.load(answers);
  const files = [];
  for (const t of answers.targets) files.push(...TARGETS[t].render(src, answers));
  return { files, src };
}

function rulesFiles(answers) {
  return [...new Set(answers.targets.map((t) => TARGETS[t].rules))];
}

const SETTINGS = '.claude/settings.json';

// Claude Code's settings file is the user's: specloop only adds or removes
// its own two hooks in it, never the whole file.
function syncSettings(cwd, answers) {
  if (!answers.targets.includes('claude')) return false;
  const current = readFile(cwd, SETTINGS);
  if (current === null && !answers.guard) return false;
  const next = project.withSpecloopHooks(current, answers.guard ? claudeSettingsHooks() : null);
  if (next === current) return false;
  writeFile(cwd, SETTINGS, next);
  return true;
}

function permissionRules(src) {
  return Object.fromEntries(src.agents.map((a) => [a.name, fm.split(a.text).data.permission || {}]));
}

// What init would do, before it does it, so the user can say no.
function plan(cwd, answers) {
  const { files, src } = generate(answers);
  const create = [];
  const conflicts = [];
  for (const f of files) {
    const current = readFile(cwd, f.path);
    if (current === null) create.push(f.path);
    else if (current !== f.content) conflicts.push(f.path);
  }
  const rules = rulesFiles(answers).map((r) => ({ path: r, exists: readFile(cwd, r) !== null }));
  const settings = answers.targets.includes('claude') && answers.guard
    ? { path: SETTINGS, exists: readFile(cwd, SETTINGS) !== null }
    : null;
  if (settings && settings.exists) project.withSpecloopHooks(readFile(cwd, SETTINGS), null); // fail now if unreadable
  return { files, src, create, conflicts, rules, settings };
}

function apply(cwd, answers, p, { overwrite, version, date, facts }) {
  const written = [];
  const skipped = [];
  for (const f of p.files) {
    if (p.conflicts.includes(f.path) && !overwrite) {
      skipped.push(f.path);
      continue;
    }
    writeFile(cwd, f.path, f.content);
    writeFile(cwd, `${BASE}/${f.path}`, f.content);
    written.push(f.path);
  }

  const block = project.rulesBlock(answers);
  for (const r of p.rules) writeFile(cwd, r.path, project.withRulesBlock(readFile(cwd, r.path), block));
  syncSettings(cwd, answers);

  for (const dir of project.docsDirs(answers)) fs.mkdirSync(path.join(cwd, dir), { recursive: true });
  const extras = [];
  const context = project.contextPath(answers);
  if (readFile(cwd, context) === null) {
    const folders = project.topFolders(cwd).filter((f) => f !== answers.docs.split('/')[0]);
    writeFile(cwd, context, project.contextStarter(answers, { stack: facts.stack, folders }));
    extras.push(context);
  }
  const status = project.statusPath(answers);
  if (readFile(cwd, status) === null) {
    writeFile(cwd, status, project.statusStarter(date));
    extras.push(status);
  }

  saveState(cwd, answers, version, written);
  return { written, skipped, extras, probes: probes.run(permissionRules(p.src), answers) };
}

function saveState(cwd, answers, version, files) {
  const config = { version, answers, files: [...files].sort() };
  writeFile(cwd, CONFIG, JSON.stringify(config, null, 2) + '\n');
  // The 0.1.x layout copied raw sources here. They are not read any more.
  for (const legacy of ['commands', 'agents', 'skills', 'SETUP.md', 'LICENSE', 'VERSION', 'previous']) {
    fs.rmSync(path.join(cwd, STATE_DIR, legacy), { recursive: true, force: true });
  }
}

function loadState(cwd) {
  const raw = readFile(cwd, CONFIG);
  return raw ? JSON.parse(raw) : null;
}

function mergeFile(cwd, current, base, next) {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'specloop-'));
  const write = (name, text) => {
    const p = path.join(tmp, name);
    fs.writeFileSync(p, text);
    return p;
  };
  const files = [write('current', current), write('base', base), write('next', next)];
  try {
    const out = execFileSync('git', ['merge-file', '-p', '-L', 'yours', '-L', 'installed', '-L', 'specloop', ...files], { encoding: 'utf8' });
    return { text: out, conflicts: 0 };
  } catch (error) {
    // git merge-file exits with the number of conflicts, and still prints.
    if (typeof error.status === 'number' && error.status > 0 && error.stdout) {
      return { text: error.stdout, conflicts: error.status };
    }
    throw new Error(`git merge-file failed: ${error.message}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Bring docs from the earlier layout to the current one. git mv keeps each
// file's history; a file git does not track is simply renamed. Nothing is
// ever overwritten: when both places hold something, both stay for you.
function migrateLayout(cwd, answers) {
  const moved = [];
  const blocked = [];
  const isEmptyDir = (abs) => fs.statSync(abs).isDirectory() && fs.readdirSync(abs).length === 0;
  for (const [from, to] of project.layoutMoves(answers)) {
    const src = path.join(cwd, from);
    const dest = path.join(cwd, to);
    if (!fs.existsSync(src)) continue;
    if (isEmptyDir(src)) {
      fs.rmdirSync(src);
      continue;
    }
    if (fs.existsSync(dest)) {
      if (!isEmptyDir(dest)) {
        blocked.push(`${from} (${to} already exists)`);
        continue;
      }
      fs.rmdirSync(dest);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      execFileSync('git', ['mv', from, to], { cwd, stdio: 'ignore' });
    } catch {
      fs.renameSync(src, dest);
    }
    moved.push(`${from} -> ${to}`);
  }
  return { moved, blocked };
}

function update(cwd, state, version) {
  const answers = state.answers;
  const { files, src } = generate(answers);
  const report = { updated: [], merged: [], conflicted: [], kept: [], added: [], removed: [], orphaned: [], unchanged: 0 };
  Object.assign(report, migrateLayout(cwd, answers));
  for (const dir of project.docsDirs(answers)) fs.mkdirSync(path.join(cwd, dir), { recursive: true });
  const now = [];

  for (const f of files) {
    const current = readFile(cwd, f.path);
    const base = readFile(cwd, `${BASE}/${f.path}`);
    if (current === null) {
      if (base === null) {
        writeFile(cwd, f.path, f.content);
        report.added.push(f.path);
      } else {
        // You deleted it after install. Leave it deleted, and remember that.
        report.kept.push(`${f.path} (deleted by you, not recreated)`);
        now.push(f.path);
        continue;
      }
    } else if (current === f.content) {
      report.unchanged++;
    } else if (base === null) {
      // It was there before specloop, and not ours to change.
      report.kept.push(`${f.path} (not written by specloop)`);
      continue;
    } else if (current === base) {
      writeFile(cwd, f.path, f.content);
      report.updated.push(f.path);
    } else if (base === f.content) {
      report.unchanged++;
    } else {
      const merged = mergeFile(cwd, current, base, f.content);
      writeFile(cwd, f.path, merged.text);
      (merged.conflicts ? report.conflicted : report.merged).push(f.path);
    }
    writeFile(cwd, `${BASE}/${f.path}`, f.content);
    now.push(f.path);
  }

  for (const old of state.files || []) {
    if (now.includes(old)) continue;
    const current = readFile(cwd, old);
    const base = readFile(cwd, `${BASE}/${old}`);
    if (current !== null && current === base) {
      removeFile(cwd, old);
      report.removed.push(old);
    } else if (current !== null) {
      report.orphaned.push(old);
    }
    removeFile(cwd, `${BASE}/${old}`);
  }

  const block = project.rulesBlock(answers);
  for (const r of rulesFiles(answers)) writeFile(cwd, r, project.withRulesBlock(readFile(cwd, r), block));
  if (syncSettings(cwd, answers)) report.updated.push(`${SETTINGS} (specloop hooks)`);

  saveState(cwd, answers, version, now);
  report.probes = probes.run(permissionRules(src), answers);
  return report;
}

module.exports = { plan, apply, update, loadState, generate, mergeFile, STATE_DIR, CONFIG, BASE, SETTINGS };
