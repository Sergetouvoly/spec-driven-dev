#!/usr/bin/env node
// Regenerates everything in memory and fails if dist/ diverges, then validates
// the frontmatter of every generated file.
//
// This is the gate CI runs. It exists because dist/ is committed: a template
// edited without a rebuild ships a target that silently lags behind the others.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectAdapters, collectTemplates, generate, splitFrontmatter, DIST_DIR,
} from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Git may check dist/ out with CRLF on Windows. Line endings are not a
// divergence worth failing on; content is.
const normalize = (text) => text.replace(/\r\n/g, '\n');

function listDist() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else out.push(path.relative(ROOT, abs).split(path.sep).join('/'));
    }
  };
  if (fs.existsSync(DIST_DIR)) walk(DIST_DIR);
  return out;
}

function firstDifferingLine(expected, actual) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return 'line ' + (i + 1) + '\n      expected: ' + JSON.stringify(a[i]) +
             '\n      on disk:  ' + JSON.stringify(b[i]);
    }
  }
  return 'trailing content';
}

function checkSync(files, errors) {
  const onDisk = listDist();
  for (const rel of onDisk) {
    if (!files.has(rel)) {
      errors.push(rel + ': present in dist/ but no template or adapter produces it');
    }
  }
  for (const [rel, content] of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      errors.push(rel + ': missing from dist/');
      continue;
    }
    const actual = normalize(fs.readFileSync(abs, 'utf8'));
    if (actual !== normalize(content)) {
      errors.push(rel + ': differs from what the build produces, at ' +
                  firstDifferingLine(normalize(content), actual));
    }
  }
}

// Every generated file must announce itself. `description` is what makes a
// command, a skill or a prompt discoverable on every target: a file without one
// is installed and never found.
function checkFrontmatter(files, errors) {
  for (const [rel, content] of files) {
    if (content.trim() === '') {
      errors.push(rel + ': generated file is empty');
      continue;
    }
    let parsed;
    try {
      parsed = splitFrontmatter(content, rel);
    } catch (err) {
      errors.push(rel + ': ' + err.message);
      continue;
    }
    const entry = parsed.entries.find((e) => e.key === 'description');
    if (!entry) {
      errors.push(rel + ': frontmatter has no description field');
    } else if (entry.value.replace(/^["']|["']$/g, '').trim() === '') {
      errors.push(rel + ': description is empty');
    }
    if (parsed.body.trim() === '') {
      errors.push(rel + ': generated file has frontmatter but no body');
    }
  }
}

function main() {
  const files = generate(collectAdapters(), collectTemplates());
  const errors = [];

  checkSync(files, errors);
  checkFrontmatter(files, errors);

  if (errors.length) {
    console.error('check failed: ' + errors.length + ' problem(s)\n');
    for (const e of errors) console.error('  - ' + e);
    console.error('\nRun `node scripts/build.mjs` and commit the result.');
    process.exit(1);
  }

  console.log('check passed: ' + files.size + ' files in sync, frontmatter valid');
}

try {
  main();
} catch (err) {
  console.error('check failed: ' + err.message);
  process.exit(1);
}
