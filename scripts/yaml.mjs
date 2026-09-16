// A reader for the YAML subset the adapters use: nested maps, block and flow
// sequences, flow maps, folded scalars, quoted and bare strings, booleans and
// null. Deliberately small: adapters are data files we control, and a
// dependency would make `node scripts/build.mjs` stop working on a clean
// clone.

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === '{}') return {};
  if (s === '[]') return [];
  if (s.startsWith('"') && s.endsWith('"') && s.length > 1) return s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'") && s.length > 1) return s.slice(1, -1);
  if (s.startsWith('[') && s.endsWith(']')) {
    return splitFlow(s.slice(1, -1)).map(parseScalar);
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    const out = {};
    for (const part of splitFlow(s.slice(1, -1))) {
      const at = part.indexOf(':');
      if (at === -1) throw new Error(`bad flow map entry: ${part}`);
      out[parseScalar(part.slice(0, at))] = parseScalar(part.slice(at + 1));
    }
    return out;
  }
  if (/^-?\d+$/.test(s)) return Number(s);
  return s;
}

// Split on commas that are not inside quotes or nested brackets.
function splitFlow(inner) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) {
      out.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  out.push(inner.slice(start));
  return out.map((s) => s.trim()).filter((s) => s !== '');
}

function indentOf(line) {
  return line.length - line.trimStart().length;
}

// lines: [{ indent, text }] already stripped of comments and blanks.
function parseBlock(lines, i, indent) {
  if (i >= lines.length) return [null, i];
  if (lines[i].text.startsWith('- ')|| lines[i].text === '-') {
    const arr = [];
    while (i < lines.length && lines[i].indent === indent &&
           (lines[i].text.startsWith('- ') || lines[i].text === '-')) {
      const rest = lines[i].text.slice(1).trim();
      if (rest === '') {
        const [v, next] = parseBlock(lines, i + 1, indent + 2);
        arr.push(v);
        i = next;
      } else if (/^[A-Za-z0-9_.$-]+:(\s|$)/.test(rest)) {
        // An inline map entry starts the item; its siblings follow, indented
        // to where the entry's key sits.
        const keyIndent = indent + 2;
        const synthetic = [{ indent: keyIndent, text: rest }];
        let j = i + 1;
        while (j < lines.length && lines[j].indent >= keyIndent) {
          synthetic.push(lines[j]);
          j++;
        }
        const [v] = parseBlock(synthetic, 0, keyIndent);
        arr.push(v);
        i = j;
      } else {
        arr.push(parseScalar(rest));
        i++;
      }
    }
    return [arr, i];
  }

  const map = {};
  while (i < lines.length && lines[i].indent === indent) {
    const text = lines[i].text;
    const at = text.indexOf(':');
    if (at === -1) throw new Error(`expected "key: value", got: ${text}`);
    const key = parseScalar(text.slice(0, at));
    const rest = text.slice(at + 1).trim();
    if (rest === '>-' || rest === '>' || rest === '|' || rest === '|-') {
      const folded = rest[0] === '>';
      const parts = [];
      let j = i + 1;
      while (j < lines.length && lines[j].indent > indent) {
        parts.push(lines[j].text);
        j++;
      }
      map[key] = folded ? parts.join(' ') : parts.join('\n');
      i = j;
    } else if (rest === '') {
      if (i + 1 < lines.length && lines[i + 1].indent > indent) {
        const [v, next] = parseBlock(lines, i + 1, lines[i + 1].indent);
        map[key] = v;
        i = next;
      } else {
        map[key] = null;
        i++;
      }
    } else {
      map[key] = parseScalar(rest);
      i++;
    }
  }
  return [map, i];
}

export function parseYaml(text) {
  const lines = [];
  for (const raw of text.split(/\r?\n/)) {
    const stripped = stripComment(raw);
    if (stripped.trim() === '' || stripped.trim() === '---') continue;
    lines.push({ indent: indentOf(stripped), text: stripped.trim() });
  }
  if (lines.length === 0) return {};
  const [value] = parseBlock(lines, 0, lines[0].indent);
  return value;
}
