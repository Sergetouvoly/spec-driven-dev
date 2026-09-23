#!/usr/bin/env node
'use strict';

// Claude Code hook installed by specloop.
//
// Claude Code cannot express per-agent path and command rules in an agent
// file, so this hook evaluates the same `permission` blocks the opencode and
// Kilo agents carry, with the same semantics: `*` matches any run of
// characters, `?` one, and the last matching rule wins.
//
// It only ever denies or asks. An `allow` is left to Claude Code's own
// permission system, so this hook can never grant more than the user did.
//
// Three modes:
//   prompt        UserPromptSubmit. A slash command bound to an agent makes
//                 that agent active for the session; any other slash command
//                 clears it. Plain messages keep it, so an interview can go on.
//   pre           PreToolUse. Applies the active agent's rules, if any.
//   agent <name>  PreToolUse inside a subagent. Applies that agent's rules.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const RULES_FILE = path.join(__dirname, 'specloop-permissions.json');

function wildcardToRegExp(pattern) {
  let re = '';
  for (const ch of pattern) {
    if (ch === '*') re += '.*';
    else if (ch === '?') re += '.';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$', process.platform === 'win32' ? 'si' : 's');
}

// A rule is "allow" | "ask" | "deny", or an ordered map of pattern -> action.
function decide(rule, subject) {
  if (rule === undefined) return null;
  if (typeof rule === 'string') return rule;
  let result = null;
  for (const [pattern, action] of Object.entries(rule)) {
    if (wildcardToRegExp(pattern).test(subject)) result = action;
  }
  return result;
}

function strictest(decisions) {
  if (decisions.includes('deny')) return 'deny';
  if (decisions.includes('ask')) return 'ask';
  if (decisions.includes('allow')) return 'allow';
  return null;
}

// Split a shell line into the commands it runs, so `cd x && cat secret` is
// judged on `cat secret` too. Quotes are respected; this is not a full parser.
function splitCommands(line) {
  const parts = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    const two = line.slice(i, i + 2);
    if (two === '&&' || two === '||') { parts.push(current); current = ''; i++; continue; }
    if (ch === ';' || ch === '|' || ch === '\n' || ch === '&') { parts.push(current); current = ''; continue; }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// On Windows a path can arrive as C:\x, C:/x or /c/x (Git Bash). Bring every
// form to C:/x so the project root and the file compare equal.
function normalize(p) {
  let s = String(p).replace(/\\/g, '/');
  if (process.platform === 'win32') {
    const msys = /^\/([a-zA-Z])(\/|$)/.exec(s);
    if (msys) s = `${msys[1]}:/${s.slice(3)}`;
    s = s.replace(/^([a-zA-Z]):/, (m, d) => `${d.toUpperCase()}:`);
  }
  return s;
}

function toProjectPath(file, root) {
  if (!file) return '';
  const base = normalize(root).replace(/\/+$/, '');
  const target = normalize(file);
  const isAbsolute = target.startsWith('/') || /^[A-Z]:\//.test(target);
  const absolute = path.posix.normalize(isAbsolute ? target : `${base}/${target}`);
  // Windows paths are case-insensitive: compare the prefix that way.
  const same = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
  if (same(absolute, base)) return '';
  if (same(absolute.slice(0, base.length + 1), `${base}/`)) return absolute.slice(base.length + 1);
  return absolute; // outside the project: no project rule matches it
}

// Returns "deny", "ask", "allow" or null (no opinion), and the rule key used.
function evaluate(permissions, toolName, input, root) {
  const filePath = (key) => decide(permissions[key], toProjectPath(input.file_path || input.notebook_path, root));
  switch (toolName) {
    case 'Read':
      return filePath('read');
    case 'Edit':
    case 'Write':
    case 'MultiEdit':
    case 'NotebookEdit':
      return strictest([filePath('edit'), filePath('write')]);
    case 'Glob':
      return decide(permissions.glob, toProjectPath(input.path || '.', root));
    case 'Grep':
      return strictest([
        decide(permissions.grep, toProjectPath(input.path || '.', root)),
        input.path ? decide(permissions.read, toProjectPath(input.path, root)) : null,
      ]);
    case 'Bash':
    case 'PowerShell': {
      const command = String(input.command || '');
      const decisions = [decide(permissions.bash, command.trim())];
      for (const part of splitCommands(command)) decisions.push(decide(permissions.bash, part));
      return strictest(decisions);
    }
    case 'WebFetch':
      return decide(permissions.webfetch, String(input.url || ''));
    case 'WebSearch':
      return decide(permissions.websearch, String(input.query || ''));
    case 'Agent':
    case 'Task':
      return decide(lowercaseKeys(permissions.task), String(input.subagent_type || 'general-purpose').toLowerCase());
    default:
      return null;
  }
}

function lowercaseKeys(rule) {
  if (!rule || typeof rule === 'string') return rule;
  return Object.fromEntries(Object.entries(rule).map(([k, v]) => [k.toLowerCase(), v]));
}

function stateFile(root) {
  const id = crypto.createHash('sha1').update(normalize(root).toLowerCase()).digest('hex').slice(0, 16);
  return path.join(os.tmpdir(), 'specloop', `${id}.json`);
}

function readState(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state));
}

// "/implement auth-001" -> "implement"; anything else -> null
function slashCommand(prompt) {
  const m = /^\s*\/([\w:-]+)/.exec(String(prompt || ''));
  return m ? m[1].replace(/^.*:/, '') : null;
}

function setActive(root, session, command, rules) {
  const file = stateFile(root);
  const state = readState(file);
  const agent = (rules.commands || {})[command] || null;
  if (agent) state[session] = agent;
  else delete state[session];
  writeState(file, state);
}

function block(message) {
  process.stderr.write(message);
  process.exit(2);
}

function handle(mode, fixedAgent, call, rules) {
  const root = process.env.CLAUDE_PROJECT_DIR || call.cwd || process.cwd();
  const session = String(call.session_id || 'default');

  if (mode === 'prompt') {
    const command = slashCommand(call.prompt);
    if (command) setActive(root, session, command, rules);
    return;
  }

  const agent = mode === 'agent' ? fixedAgent : readState(stateFile(root))[session];

  // The model can start a workflow command itself through the Skill tool.
  // With no agent active, that is how it begins. With one active, it would be
  // an agent switching itself to other rules, or clearing its own: only the
  // user does that, by typing the command.
  if (call.tool_name === 'Skill') {
    const skill = String((call.tool_input || {}).skill || '').replace(/^.*:/, '');
    if (!Object.prototype.hasOwnProperty.call(rules.commands || {}, skill)) return;
    if (agent) block(`specloop: /${skill} cannot be started from inside the ${agent} agent. Ask the user to type it.`);
    if (mode === 'pre') setActive(root, session, skill, rules);
    return;
  }

  if (!agent) return;
  const permissions = (rules.agents || {})[agent];
  if (!permissions) block(`specloop guard: no rules for agent "${agent}". Blocked.`);

  const decision = evaluate(permissions, call.tool_name, call.tool_input || {}, root);
  if (decision === 'deny') {
    const scope = mode === 'agent' ? `the ${agent} subagent` : `the ${agent} agent, active since its command`;
    block(`specloop: ${call.tool_name} is denied to ${scope}. Do not work around it: say what you needed and stop. Typing another slash command ends this agent's rules.`);
  }
  if (decision === 'ask') {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: `specloop: the ${agent} agent must ask before this call.`,
      },
    }));
  }
}

function main() {
  const [mode, fixedAgent] = process.argv.slice(2);
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', () => {
    let rules;
    let call;
    try {
      rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
      call = JSON.parse(raw);
    } catch (error) {
      // Failing open would turn every deny into decoration without a word.
      if (mode === 'prompt') process.exit(0);
      block(`specloop guard: cannot evaluate this call (${error.message}). Blocked.`);
    }
    if (!['prompt', 'pre', 'agent'].includes(mode)) block(`specloop guard: unknown mode "${mode}". Blocked.`);
    handle(mode, fixedAgent, call, rules);
    process.exit(0);
  });
}

if (require.main === module) main();

module.exports = { evaluate, decide, splitCommands, wildcardToRegExp, slashCommand, stateFile, handle };
