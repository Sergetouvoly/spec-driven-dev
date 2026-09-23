'use strict';

// Everything the installer can see for itself, so each question comes with a
// recommended answer and the user can accept them all.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function git(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function exists(cwd, rel) {
  return fs.existsSync(path.join(cwd, rel));
}

function readJson(cwd, rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, rel), 'utf8'));
  } catch {
    return null;
  }
}

function readText(cwd, rel) {
  try {
    return fs.readFileSync(path.join(cwd, rel), 'utf8');
  } catch {
    return '';
  }
}

function targets(cwd) {
  const found = [];
  if (exists(cwd, '.claude') || exists(cwd, 'CLAUDE.md')) found.push('claude');
  if (exists(cwd, '.opencode') || exists(cwd, 'opencode.json') || exists(cwd, 'opencode.jsonc')) found.push('opencode');
  if (exists(cwd, '.kilo') || exists(cwd, '.kilocode') || exists(cwd, 'kilo.json') || exists(cwd, 'kilo.jsonc')) found.push('kilo');
  return found;
}

function branch(cwd) {
  const remoteHead = git(cwd, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (remoteHead) return remoteHead.replace(/^origin\//, '');
  for (const name of ['main', 'master', 'trunk', 'develop']) {
    if (git(cwd, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`])) return name;
  }
  const current = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return current && current !== 'HEAD' ? current : 'main';
}

// The most common first segment of existing branch names, if it is a habit.
function prefix(cwd) {
  const refs = git(cwd, ['for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes']) || '';
  const counts = {};
  const seen = new Set();
  for (const ref of refs.split('\n')) {
    const name = ref.replace(/^(origin|upstream)\//, '');
    const slash = name.indexOf('/');
    if (slash <= 0 || seen.has(name)) continue;
    seen.add(name);
    const first = name.slice(0, slash);
    counts[first] = (counts[first] || 0) + 1;
  }
  const best = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  return best && best[1] >= 2 ? best[0] : 'task';
}

function nodeRunner(cwd) {
  if (exists(cwd, 'pnpm-lock.yaml')) return 'pnpm';
  if (exists(cwd, 'yarn.lock')) return 'yarn';
  if (exists(cwd, 'bun.lockb') || exists(cwd, 'bun.lock')) return 'bun';
  return 'npm';
}

function testCommand(cwd) {
  const pkg = readJson(cwd, 'package.json');
  const script = pkg && pkg.scripts && pkg.scripts.test;
  if (script && !/no test specified/.test(script)) return `${nodeRunner(cwd)} test`;
  if (exists(cwd, 'pytest.ini') || /pytest/.test(readText(cwd, 'pyproject.toml') + readText(cwd, 'setup.cfg') + readText(cwd, 'requirements-dev.txt'))) return 'pytest';
  if (exists(cwd, 'Cargo.toml')) return 'cargo test';
  if (exists(cwd, 'go.mod')) return 'go test ./...';
  if (/^test:/m.test(readText(cwd, 'Makefile'))) return 'make test';
  if (exists(cwd, 'deno.json') || exists(cwd, 'deno.jsonc')) return 'deno test';
  if (exists(cwd, 'mix.exs')) return 'mix test';
  return null;
}

function dependencies(cwd) {
  const pkg = readJson(cwd, 'package.json') || {};
  const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  const python = (readText(cwd, 'pyproject.toml') + readText(cwd, 'requirements.txt')).toLowerCase();
  return { names, python };
}

function checks(cwd) {
  const { names, python } = dependencies(cwd);
  const has = (list) => list.some((n) => names.includes(n));
  const result = ['review'];
  const e2e = has(['@playwright/test', 'playwright', 'cypress', 'puppeteer', 'webdriverio'])
    || ['playwright.config.ts', 'playwright.config.js', 'cypress.config.ts', 'cypress.config.js'].some((f) => exists(cwd, f));
  if (e2e) result.push('e2e');
  const http = has(['express', 'fastify', 'koa', '@nestjs/core', 'next', 'hono', '@hapi/hapi', '@remix-run/node', 'nuxt', '@sveltejs/kit'])
    || /\b(django|flask|fastapi|starlette)\b/.test(python);
  if (http) result.push('pentest');
  return result;
}

function stack(cwd) {
  const out = [];
  const { names } = dependencies(cwd);
  if (exists(cwd, 'package.json')) out.push(exists(cwd, 'tsconfig.json') || names.includes('typescript') ? 'TypeScript (Node)' : 'JavaScript (Node)');
  if (exists(cwd, 'pyproject.toml') || exists(cwd, 'requirements.txt')) out.push('Python');
  if (exists(cwd, 'Cargo.toml')) out.push('Rust');
  if (exists(cwd, 'go.mod')) out.push('Go');
  if (exists(cwd, 'mix.exs')) out.push('Elixir');
  for (const fw of ['next', 'react', 'vue', 'svelte', '@nestjs/core', 'express', 'fastify', 'prisma']) {
    if (names.includes(fw)) out.push(fw.replace('@nestjs/core', 'NestJS'));
  }
  return out;
}

function detect(cwd) {
  return {
    isGit: git(cwd, ['rev-parse', '--is-inside-work-tree']) === 'true',
    targets: targets(cwd),
    branch: branch(cwd),
    prefix: prefix(cwd),
    test: testCommand(cwd),
    checks: checks(cwd),
    stack: stack(cwd),
    docs: 'docs',
  };
}

module.exports = { detect, testCommand, prefix, branch, checks, git };
