#!/usr/bin/env node
'use strict';

// Installs the specloop workflow into the current project, in the native
// format of each agent, without an LLM in the loop. SETUP.md remains for
// agents this installer does not know, and for probing permissions live.

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { detect } = require('../lib/detect');
const install = require('../lib/install');
const { TARGETS } = require('../lib/targets');
const { version } = require('../package.json');

const cwd = process.cwd();

function parseArgs(argv) {
  const opts = { _: [] };
  for (const arg of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(arg);
    if (m) opts[m[1]] = m[2] === undefined ? true : m[2];
    else if (arg === '-y') opts.yes = true;
    else if (arg === '-h') opts.help = true;
    else if (arg === '-v') opts.version = true;
    else opts._.push(arg);
  }
  return opts;
}

function fail(message) {
  console.error(`specloop: ${message}`);
  process.exit(1);
}

// Questions come with a recommended answer. Without a terminal, or with
// --yes, the recommendation is the answer.
function asker(opts) {
  const interactive = Boolean(process.stdin.isTTY) && !opts.yes;
  const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;
  const ask = (question, fallback) => new Promise((resolve) => {
    if (!rl) return resolve(fallback);
    rl.question(`${question} [${fallback}] `, (answer) => resolve(answer.trim() || fallback));
  });
  return { ask, interactive, close: () => rl && rl.close() };
}

function list(value) {
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

async function collectAnswers(opts, facts, q) {
  const answers = {};

  const knownTargets = Object.keys(TARGETS);
  const defaultTargets = (facts.targets.length ? facts.targets : ['claude']).join(',');
  const targets = list(opts.targets || await q.ask(`1. Agents to install for (${knownTargets.join(', ')})`, defaultTargets));
  const unknown = targets.filter((t) => !TARGETS[t]);
  if (unknown.length) fail(`unknown agent "${unknown.join(', ')}". Known: ${knownTargets.join(', ')}. For any other, have your agent follow SETUP.md.`);
  if (!targets.length) fail('no agent chosen.');
  answers.targets = targets;

  answers.docs = String(opts.docs || await q.ask('2. Docs folder', facts.docs)).replace(/\/+$/, '');
  answers.branch = String(opts.branch || await q.ask('3. Integration branch', facts.branch));
  const merge = String(opts.merge || await q.ask('   /done merges: direct or pr', 'direct'));
  if (!['direct', 'pr'].includes(merge)) fail(`merge must be "direct" or "pr", not "${merge}".`);
  answers.merge = merge;
  answers.prefix = String(opts.prefix || await q.ask('   Task branch prefix', facts.prefix)).replace(/\/+$/, '');

  let test;
  if (opts['no-test']) test = null;
  else if (opts.test) test = String(opts.test);
  else test = await q.ask('4. Test command, the gate /done runs ("none" if there is none)', facts.test || 'none');
  answers.test = !test || test === 'none' ? null : test;

  const optional = facts.checks.filter((c) => c !== 'review');
  const checks = opts.checks !== undefined
    ? list(opts.checks === true ? '' : opts.checks)
    : list(await q.ask('5. Optional checks, besides review (e2e, pentest, or none)', optional.join(',') || 'none'));
  const bad = checks.filter((c) => !['e2e', 'pentest', 'none'].includes(c));
  if (bad.length) fail(`unknown check "${bad.join(', ')}". Choose among e2e, pentest.`);
  answers.checks = ['review', ...checks.filter((c) => c !== 'none')];

  answers.guard = false;
  if (targets.includes('claude') && !opts['no-guard']) {
    const guard = opts.guard ? 'y' : await q.ask('6. Claude Code: enforce each agent\'s permissions with a PreToolUse hook (needs Node)? y/n', 'y');
    answers.guard = /^y/i.test(guard);
  }
  return answers;
}

function summarize(p, answers) {
  const byDir = {};
  for (const f of p.create) {
    const dir = f.split('/').slice(0, 2).join('/');
    byDir[dir] = (byDir[dir] || 0) + 1;
  }
  const lines = ['', 'Plan:'];
  for (const [dir, n] of Object.entries(byDir)) lines.push(`  create  ${dir}/  (${n} file${n > 1 ? 's' : ''})`);
  for (const r of p.rules) lines.push(`  ${r.exists ? 'append' : 'create'}  ${r.path}  (a delimited Workflow block)`);
  if (p.settings) lines.push(`  ${p.settings.exists ? 'update' : 'create'}  ${p.settings.path}  (two hooks that run the guard; the rest of the file untouched)`);
  lines.push(`  create  ${answers.docs}/specs, tasks, archive/tasks, reference/adr, workflow, and reference/CONTEXT.md, workflow/status.md if missing`);
  lines.push('  create  .specloop/  (your answers, and the generated files as a baseline for updates)');
  for (const c of p.conflicts) lines.push(`  EXISTS  ${c}  (differs; kept unless you overwrite)`);
  return lines.join('\n');
}

function enforcement(answers) {
  const lines = [];
  for (const t of answers.targets) {
    if (t === 'claude') {
      lines.push(answers.guard
        ? 'Claude Code: agent permissions enforced by .claude/hooks/specloop-guard.js. /spec, /task and /implement switch their agent\'s rules on until you type another slash command. Claude Code runs project hooks only once you trust the folder.'
        : 'Claude Code: agent permissions are ADVISORY. Without the guard hook, nothing stops the implementer reading specs or committing.');
    } else {
      lines.push(`${TARGETS[t].label}: agent permissions enforced by ${TARGETS[t].label} itself.`);
    }
  }
  lines.push('/done, /drop and /status run with the main session\'s own permissions on every agent.');
  return lines;
}

function probeReport(results) {
  const failed = results.filter((r) => !r.ok);
  const lines = [`Rules: ${results.length - failed.length} of ${results.length} permission probes say what they should.`];
  for (const r of failed) {
    lines.push(`  ! ${r.agent} ${r.tool} ${JSON.stringify(r.input)}: expected ${r.expect}, rules say ${r.got}`);
  }
  return lines;
}

async function init(opts) {
  const facts = detect(cwd);
  if (!facts.isGit) fail('this is not a git repository. The workflow lives on branches and commits: run "git init" first.');

  const state = install.loadState(cwd);
  if (state) fail(`specloop ${state.version} is already installed here. Run "npx @sergetouvoly/specloop@latest update".`);

  const q = asker(opts);
  if (q.interactive) console.log(`specloop ${version}. Press Enter to accept each recommended answer.\n`);
  else if (!opts.yes) console.log('No terminal to ask in: using the recommended answers, and any options given.');
  const answers = await collectAnswers(opts, facts, q);
  const p = install.plan(cwd, answers);
  console.log(summarize(p, answers));
  console.log('');
  for (const line of enforcement(answers)) console.log(line);

  if (opts['dry-run']) {
    q.close();
    console.log('\nDry run: nothing written.');
    return;
  }

  let overwrite = Boolean(opts.overwrite);
  if (p.conflicts.length && !overwrite && q.interactive) {
    overwrite = /^y/i.test(await q.ask(`\n${p.conflicts.length} file(s) already exist and differ. Overwrite them? y/n`, 'n'));
  }
  if (q.interactive && !/^y/i.test(await q.ask('\nWrite these files? y/n', 'y'))) {
    q.close();
    console.log('Nothing written.');
    return;
  }
  q.close();

  const date = new Date().toISOString().slice(0, 10);
  const result = install.apply(cwd, answers, p, { overwrite, version, date, facts });

  const out = [
    '',
    `Installed specloop ${version} for: ${answers.targets.map((t) => TARGETS[t].label).join(', ')}`,
    `Files: ${result.written.length} written${result.skipped.length ? `, ${result.skipped.length} kept as they were: ${result.skipped.join(', ')}` : ''}`,
    `Docs: ${answers.docs}/${result.extras.length ? ` (new: ${result.extras.join(', ')})` : ''}`,
    `Verify: ${answers.test || 'manual. Tasks will close on a human yes, with no exit code behind it.'}`,
    `Checks: ${answers.checks.join(', ')}`,
    ...probeReport(result.probes),
    '',
    `Next: fill in ${answers.docs}/reference/CONTEXT.md, commit everything including .specloop/, then run /spec on your next feature.`,
  ];
  console.log(out.join('\n'));
}

function update(opts) {
  const state = install.loadState(cwd);
  if (!state) {
    if (fs.existsSync(path.join(cwd, install.STATE_DIR))) {
      fail('.specloop/ comes from specloop 0.1, which only copied sources. Run "npx @sergetouvoly/specloop@latest init" once: it asks the questions again and records your answers.');
    }
    fail('specloop is not installed here. Run "npx @sergetouvoly/specloop init".');
  }
  if (state.version === version && !opts.force) {
    console.log(`specloop ${version} is already installed. Nothing to do.`);
    return;
  }

  const r = install.update(cwd, state, version);
  const section = (label, items) => (items.length ? [`${label}:`, ...items.map((i) => `  ${i}`)] : []);
  const out = [
    `Updated specloop ${state.version} -> ${version}`,
    ...section('Moved to the new docs layout', r.moved),
    ...section('NOT moved, both places hold something (merge them by hand)', r.blocked),
    ...section('Updated', r.updated),
    ...section('Merged with your edits', r.merged),
    ...section('CONFLICTS to resolve (look for <<<<<<< markers)', r.conflicted),
    ...section('Added', r.added),
    ...section('Removed', r.removed),
    ...section('No longer generated, kept because you edited them', r.orphaned),
    ...section('Left alone', r.kept),
    `Unchanged: ${r.unchanged}`,
    ...probeReport(r.probes),
    '',
    r.conflicted.length
      ? 'Next: resolve the conflicts, then commit the changes and .specloop/ together.'
      : 'Next: review the diff, then commit the changes and .specloop/ together.',
  ];
  console.log(out.join('\n'));
  if (r.conflicted.length) process.exitCode = 1;
}

function help() {
  console.log(`specloop ${version}

Usage:
  npx @sergetouvoly/specloop init [options]
      ask a few questions, then write the commands, skills and agents
      in each agent's native format, and the docs/ tree
  npx @sergetouvoly/specloop@latest update
      regenerate with the answers you gave, merging with your own edits

Agents: ${Object.entries(TARGETS).map(([k, t]) => `${k} (${t.label})`).join(', ')}.
Any other: have your agent follow SETUP.md from the repository.

Options for init (each one skips its question):
  --targets=claude,opencode   --docs=docs          --branch=main
  --merge=direct|pr           --prefix=task        --test="npm test" | --no-test
  --checks=e2e,pentest        --no-guard           --overwrite
  --yes, -y                   accept every recommendation
  --dry-run                   show the plan, write nothing`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const command = opts._[0];
  if (opts.version) return console.log(version);
  if (opts.help || !command || command === 'help') return help();
  if (command === 'init') return init(opts);
  if (command === 'update') return update(opts);
  fail(`unknown command "${command}". Run "npx @sergetouvoly/specloop --help".`);
}

main().catch((error) => fail(error.message));
