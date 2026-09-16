#!/usr/bin/env node
// Reads templates/ and adapters/, writes dist/<agent>/.
//
// templates/ is written in the Kilo Code format: that is the pivot. Each
// adapter describes one transform away from it. Nothing here knows the name of
// a command, an agent or a target; add adapters/<id>.yml and a target exists.
//
// dist/ is generated. Never edit it by hand.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './yaml.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const ADAPTERS_DIR = path.join(ROOT, 'adapters');
export const TEMPLATES_DIR = path.join(ROOT, 'templates');
export const DIST_DIR = path.join(ROOT, 'dist');

// ---------------------------------------------------------------- frontmatter

// Frontmatter is kept as ordered raw blocks rather than a parsed object: a kept
// field is re-emitted byte for byte, so a target with the same permission model
// as the pivot round-trips exactly.
export function splitFrontmatter(text, where) {
  const lines = text.split('\n');
  if (lines[0].trimEnd() !== '---') {
    throw new Error(where + ': no frontmatter');
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trimEnd() === '---') { end = i; break; }
  }
  if (end === -1) throw new Error(where + ': unterminated frontmatter');

  const entries = [];
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      if (entries.length) entries[entries.length - 1].lines.push(line);
      continue;
    }
    if (/^\s/.test(line)) {
      if (!entries.length) throw new Error(where + ': indented line before any key');
      entries[entries.length - 1].lines.push(line);
      continue;
    }
    const at = line.indexOf(':');
    if (at === -1) throw new Error(where + ': expected "key: value", got: ' + line);
    entries.push({
      key: line.slice(0, at).trim(),
      value: line.slice(at + 1).trim(),
      lines: [line],
    });
  }
  return { entries, body: lines.slice(end + 1).join('\n') };
}

// A pivot action is granted when it is `allow`, or when any of its path rules
// is. A whole-tool allowlist cannot say less than that.
function allowedActions(entry) {
  const nested = entry.lines.slice(1).filter((l) => l.trim() !== '');
  if (nested.length === 0) return [];
  const indent = (l) => l.length - l.trimStart().length;
  const base = indent(nested[0]);
  const out = [];
  for (let i = 0; i < nested.length; i++) {
    if (indent(nested[i]) !== base) continue;
    const at = nested[i].indexOf(':');
    const action = nested[i].slice(0, at).trim().replace(/^["']|["']$/g, '');
    const value = nested[i].slice(at + 1).trim();
    if (value === 'allow') { out.push(action); continue; }
    if (value !== '') continue;
    for (let j = i + 1; j < nested.length; j++) {
      if (indent(nested[j]) <= base) break;
      if (nested[j].trim().endsWith(': allow')) { out.push(action); break; }
    }
  }
  return out;
}

// ------------------------------------------------------------------ discovery

export function collectTemplates(dir = TEMPLATES_DIR) {
  const out = [];
  const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

  const commands = path.join(dir, 'commands');
  for (const f of fs.readdirSync(commands).sort()) {
    if (!f.endsWith('.md')) continue;
    out.push({
      type: 'commands',
      name: f.slice(0, -3),
      source: 'templates/commands/' + f,
      text: read(path.join(commands, f)),
    });
  }

  const agents = path.join(dir, 'agents');
  for (const f of fs.readdirSync(agents).sort()) {
    if (!f.endsWith('.md')) continue;
    out.push({
      type: 'agents',
      name: f.slice(0, -3),
      source: 'templates/agents/' + f,
      text: read(path.join(agents, f)),
    });
  }

  const skills = path.join(dir, 'skills');
  for (const d of fs.readdirSync(skills).sort()) {
    const file = path.join(skills, d, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    out.push({
      type: 'skills',
      name: d,
      source: 'templates/skills/' + d + '/SKILL.md',
      text: read(file),
    });
  }
  return out;
}

export function collectAdapters(dir = ADAPTERS_DIR) {
  return fs.readdirSync(dir).sort()
    .filter((f) => f.endsWith('.yml'))
    .map((f) => {
      const adapter = parseYaml(fs.readFileSync(path.join(dir, f), 'utf8'));
      const id = f.slice(0, -4);
      if (adapter.id !== id) {
        throw new Error('adapters/' + f + ': id is "' + adapter.id + '", expected "' + id + '"');
      }
      return adapter;
    });
}

// ------------------------------------------------------------------ transform

// Values added by an adapter are plain data, so they may be empty or start with
// a YAML indicator. `applyTo: **` parses as an alias, not a glob.
function emitScalar(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String(value);
  if (value === '' || /^[-?:,[\]{}#&*!|>'"%@`]/.test(value) ||
      /:\s|\s#|^\s|\s$/.test(value)) {
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return value;
}

function renderOne(adapter, tpl) {
  const rules = adapter.frontmatter && adapter.frontmatter[tpl.type];
  if (!rules) throw new Error(adapter.id + ': no frontmatter rules for "' + tpl.type + '"');

  const target = adapter.paths && adapter.paths[tpl.type];
  if (!target) throw new Error(adapter.id + ': no path for "' + tpl.type + '"');

  const { entries, body } = splitFrontmatter(tpl.text, tpl.source);
  const rename = rules.rename || {};
  const keep = rules.keep || [];
  const drop = rules.drop || [];
  const add = rules.add || {};
  const compensate = rules.compensate || {};

  const byKey = new Map();
  const dropped = new Map();
  for (const entry of entries) {
    const key = rename[entry.key] === undefined ? entry.key : rename[entry.key];
    if (drop.includes(key)) { dropped.set(key, entry); continue; }
    if (!keep.includes(key)) {
      throw new Error(
        tpl.source + ': field "' + key + '" is in neither keep nor drop for ' +
        adapter.id + '/' + tpl.type + '. Sort it explicitly rather than guess.');
    }
    if (key === entry.key) {
      byKey.set(key, entry.lines);
    } else {
      const head = entry.lines[0];
      byKey.set(key, [key + ':' + head.slice(head.indexOf(':') + 1), ...entry.lines.slice(1)]);
    }
  }

  const out = [];
  for (const key of keep) if (byKey.has(key)) out.push(...byKey.get(key));
  for (const key of Object.keys(add)) {
    const value = typeof add[key] === 'string'
      ? add[key].split('{name}').join(tpl.name)
      : add[key];
    out.push(key + ': ' + emitScalar(value));
  }

  const perms = adapter.permissions || {};
  if (perms.model === 'tool-allowlist' && dropped.has('permission')) {
    if (!perms.field) throw new Error(adapter.id + ': tool-allowlist needs permissions.field');
    const map = perms.tool_map || {};
    const tools = allowedActions(dropped.get('permission'))
      .map((a) => map[a])
      .filter(Boolean);
    out.push(perms.field + ': [' + tools.join(', ') + ']');
  }

  // A guarantee the target cannot express comes back as prose. It is never
  // dropped silently: a user who believes the spec writer cannot touch code,
  // when nothing prevents it, is worse off than one who knows.
  const notes = [];
  for (const key of Object.keys(compensate)) {
    if (!dropped.has(key)) continue;
    notes.push('- ' + String(compensate[key]).split('{value}').join(dropped.get(key).value));
  }

  let text = body;
  const args = adapter.arguments || {};
  if (!args.syntax && args.fallback) {
    text = text.split('$ARGUMENTS').join(args.fallback);
  }
  if (notes.length) {
    text = text.replace(/\s+$/, '') + '\n\n## On this target\n\n' + notes.join('\n') + '\n';
  }

  return {
    path: adapter.dist + '/' + target.split('{name}').join(tpl.name),
    content: '---\n' + out.join('\n') + '\n---\n' + text.replace(/\s+$/, '') + '\n',
  };
}

// Returns Map<repo-relative path, content> for every adapter.
export function generate(adapters, templates) {
  const files = new Map();
  for (const adapter of adapters) {
    for (const tpl of templates) {
      const rendered = renderOne(adapter, tpl);
      if (files.has(rendered.path)) {
        throw new Error(adapter.id + ': two templates both write ' + rendered.path);
      }
      files.set(rendered.path, rendered.content);
    }
  }
  return new Map([...files].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
}

// ----------------------------------------------------------------------- main

function main() {
  const adapters = collectAdapters();
  const templates = collectTemplates();
  const files = generate(adapters, templates);

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  for (const [rel, content] of files) {
    const abs = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }

  console.log(templates.length + ' templates x ' + adapters.length + ' adapters -> ' + files.size + ' files');
  for (const adapter of adapters) {
    const n = [...files.keys()].filter((p) => p.startsWith(adapter.dist + '/')).length;
    console.log('  ' + adapter.dist.padEnd(20) + ' ' + n + ' files');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error('build failed: ' + err.message);
    process.exit(1);
  }
}
