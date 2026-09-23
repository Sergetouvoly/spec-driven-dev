#!/usr/bin/env node
'use strict';

// Copies the workflow sources into .specloop/ and hands over to the agent.
// It installs nothing into the agent's own folders: SETUP.md does that, because
// only the agent can ask the questions and translate the permissions.

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.join(__dirname, '..');
const SOURCES = ['commands', 'agents', 'skills', 'SETUP.md', 'LICENSE'];
const DEST = path.join(process.cwd(), '.specloop');
const PREVIOUS = path.join(DEST, 'previous');
const VERSION_FILE = 'VERSION';

const { version } = require(path.join(PKG_ROOT, 'package.json'));

function copySources(to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of SOURCES) {
    fs.cpSync(path.join(PKG_ROOT, entry), path.join(to, entry), { recursive: true });
  }
  fs.writeFileSync(path.join(to, VERSION_FILE), version + '\n');
}

function installedVersion() {
  try {
    return fs.readFileSync(path.join(DEST, VERSION_FILE), 'utf8').trim();
  } catch {
    return null;
  }
}

function init() {
  if (fs.existsSync(DEST)) {
    fail(`.specloop/ already exists (version ${installedVersion() || 'unknown'}). Run "npx specloop@latest update" instead.`);
  }
  copySources(DEST);
  console.log(`specloop ${version} copied to .specloop/

Nothing is installed yet. Ask your coding agent:

  Follow .specloop/SETUP.md and set this project up.

It will detect which agent it is, ask about five questions, and write the
commands, skills and subagents in that agent's native format.
Commit .specloop/ with them: it is the baseline the next update diffs against.`);
}

function update() {
  const from = installedVersion();
  if (!from) {
    fail('.specloop/ not found. Run "npx specloop init" first.');
  }
  if (from === version) {
    console.log(`specloop ${version} is already the installed version. Nothing to do.`);
    return;
  }
  if (fs.existsSync(PREVIOUS)) {
    fail('.specloop/previous/ is still there: the last update was never applied. Ask your agent to finish it, or delete that folder, then run update again.');
  }

  // Keep the old sources next to the new ones so the agent can diff them.
  fs.mkdirSync(PREVIOUS);
  for (const entry of fs.readdirSync(DEST)) {
    if (entry === 'previous') continue;
    fs.renameSync(path.join(DEST, entry), path.join(PREVIOUS, entry));
  }
  copySources(DEST);

  console.log(`specloop updated in .specloop/: ${from} -> ${version}
The old sources are in .specloop/previous/.

Your installed commands are not changed yet. Ask your coding agent:

  Follow the "Update" section of .specloop/SETUP.md.

It will diff the two versions and carry each change into the files it
installed, keeping the answers you gave at install time.`);
}

function help() {
  console.log(`specloop ${version}

Usage:
  npx specloop init      copy the workflow sources into .specloop/
  npx specloop@latest update
                         replace them with the latest version, keeping the old
                         ones in .specloop/previous/ for your agent to diff

Then your agent follows .specloop/SETUP.md. This tool never writes anywhere
else, and adds no dependency to your project.`);
}

function fail(message) {
  console.error(`specloop: ${message}`);
  process.exit(1);
}

const command = process.argv[2];
switch (command) {
  case 'init': init(); break;
  case 'update': update(); break;
  case '--version': case '-v': console.log(version); break;
  case undefined: case 'help': case '--help': case '-h': help(); break;
  default: fail(`unknown command "${command}". Run "npx specloop --help".`);
}
