'use strict';

// One renderer per agent. Each returns the files to write, as
// [{ path, content }], from sources that are already substituted.

const fs = require('fs');
const path = require('path');
const fm = require('./frontmatter');

const ARGUMENT_HINTS = {
  spec: '<feature idea>',
  task: '<spec> | --adhoc "<description>"',
  implement: '[task id | spec slug]',
  done: '[task id]',
  drop: '<task id> <reason>',
};

// opencode and Kilo read the sources' own format: frontmatter with
// `agent:` on commands and a `permission` block per agent, last match wins.
function nativeRenderer(dir) {
  return (src) => [
    ...src.commands.map((c) => ({ path: `${dir}/commands/${c.name}.md`, content: c.text })),
    ...src.agents.map((a) => ({ path: `${dir}/agents/${a.name}.md`, content: a.text })),
    ...src.skills.map((s) => ({ path: `${dir}/skills/${s.name}/SKILL.md`, content: s.text })),
  ];
}

function yamlString(s) {
  return JSON.stringify(s);
}

const GUARD = '.claude/hooks/specloop-guard.js';
const guardCommand = (args) => `node "$CLAUDE_PROJECT_DIR/${GUARD}" ${args}`;

function subagentHook(agent) {
  return [
    'hooks:',
    '  PreToolUse:',
    '    - matcher: "*"',
    '      hooks:',
    '        - type: command',
    `          command: ${yamlString(guardCommand(`agent ${agent}`))}`,
  ];
}

// The hooks specloop owns in .claude/settings.json. A hook in a command's
// frontmatter would stay registered for the rest of the session, stacking one
// agent's rules on the next; these track which agent is active instead.
function claudeSettingsHooks() {
  return {
    UserPromptSubmit: [{ hooks: [{ type: 'command', command: guardCommand('prompt') }] }],
    PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: guardCommand('pre') }] }],
  };
}

// Claude Code keeps per-agent path and command rules out of agent files, so:
// - a command bound to a primary agent (`agent:`) runs in the main session and
//   carries that agent's instructions; with the guard, typing it makes that
//   agent's rules apply until another slash command is typed;
// - a subagent (the reviewer) becomes a Claude Code subagent with the tools
//   its permissions leave it, and its own guard hook for everything finer.
function claude(src, answers) {
  const agents = Object.fromEntries(src.agents.map((a) => [a.name, fm.split(a.text)]));
  const files = [];

  for (const c of src.commands) {
    const { data, body } = fm.split(c.text);
    const head = [`description: ${yamlString(data.description)}`];
    if (ARGUMENT_HINTS[c.name]) head.push(`argument-hint: ${yamlString(ARGUMENT_HINTS[c.name])}`);
    let text = body;
    if (data.agent) {
      text += `\n---\n\n# Your role for this command: ${data.agent}\n\n${agents[data.agent].body}`;
    }
    files.push({ path: `.claude/commands/${c.name}.md`, content: `---\n${head.join('\n')}\n---\n\n${text.replace(/^\n+/, '')}` });
  }

  for (const a of src.agents) {
    const { data, body } = agents[a.name];
    if (data.mode !== 'subagent') continue;
    const head = [
      `name: ${a.name}`,
      `description: ${yamlString(data.description)}`,
      `tools: ${claudeTools(data.permission || {}).join(', ')}`,
    ];
    if (answers.guard) head.push(...subagentHook(a.name));
    files.push({ path: `.claude/agents/${a.name}.md`, content: `---\n${head.join('\n')}\n---\n\n${body.replace(/^\n+/, '')}` });
  }

  for (const s of src.skills) {
    files.push({ path: `.claude/skills/${s.name}/SKILL.md`, content: s.text });
  }

  if (answers.guard) {
    const rules = {
      commands: Object.fromEntries(src.commands.map((c) => [c.name, fm.split(c.text).data.agent || null])),
      agents: Object.fromEntries(Object.entries(agents).map(([name, { data }]) => [name, data.permission || {}])),
    };
    files.push({ path: '.claude/hooks/specloop-permissions.json', content: JSON.stringify(rules, null, 2) + '\n' });
    files.push({
      path: GUARD,
      content: fs.readFileSync(path.join(__dirname, 'templates', 'specloop-guard.js'), 'utf8').replace(/\r\n/g, '\n'),
    });
  }
  return files;
}

// A tool is kept unless its rule is a flat "deny". Finer rules are the guard's.
function claudeTools(permission) {
  const denied = (key) => permission[key] === 'deny';
  const tools = [];
  if (!denied('read')) tools.push('Read');
  if (!denied('glob')) tools.push('Glob');
  if (!denied('grep')) tools.push('Grep');
  if (!denied('edit')) tools.push('Edit');
  if (!denied('write')) tools.push('Write');
  if (!denied('bash')) tools.push('Bash');
  if (!denied('webfetch')) tools.push('WebFetch');
  if (!denied('task')) tools.push('Agent');
  return tools;
}

const TARGETS = {
  claude: { label: 'Claude Code', rules: 'CLAUDE.md', dir: '.claude', render: claude },
  opencode: { label: 'opencode', rules: 'AGENTS.md', dir: '.opencode', render: nativeRenderer('.opencode') },
  kilo: { label: 'Kilo Code', rules: 'AGENTS.md', dir: '.kilo', render: nativeRenderer('.kilo') },
};

module.exports = { TARGETS, claudeTools, claudeSettingsHooks, GUARD };
