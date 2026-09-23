'use strict';

// Just enough YAML for the frontmatter this repository writes: nested maps by
// two-space indentation, quoted or bare keys, scalar values. Anything else is
// a mistake in a source file, and it throws rather than guessing.

function split(text) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { data: {}, raw: '', body: text };
  return { data: parse(match[1]), raw: match[1], body: text.slice(match[0].length) };
}

function unquote(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parse(yaml) {
  const root = {};
  const stack = [{ indent: -1, node: root }];
  for (const line of yaml.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const m = /^\s*("[^"]*"|'[^']*'|[^:]+):\s*(.*)$/.exec(line);
    if (!m) throw new Error(`frontmatter: cannot parse line "${line}"`);
    while (stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack[stack.length - 1].node;
    const key = unquote(m[1]);
    const value = m[2].trim();
    if (value === '') {
      parent[key] = {};
      stack.push({ indent, node: parent[key] });
    } else {
      parent[key] = unquote(value);
    }
  }
  return root;
}

module.exports = { split, parse };
