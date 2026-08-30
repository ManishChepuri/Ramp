#!/usr/bin/env node
/**
 * ramp CLI — entry point
 *
 * Commands:
 *   ramp generate <repo>   — run the Bob pipeline, write ramp-manifest.json
 *   ramp open              — start the local server and open the browser
 *   ramp <repo>            — generate (if needed) then open
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path  = require('path');
const fs    = require('fs');
const { generate } = require('./lib/generate');
const { open }     = require('./lib/open');
const { preflight }= require('./lib/preflight');

const [,, cmd, ...args] = process.argv;

// ─── dispatch ────────────────────────────────────────────────────────────────

async function main() {
  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  if (cmd === 'generate') {
    const repoPath = args[0];
    if (!repoPath) {
      console.error('Usage: ramp generate <repo-path>');
      process.exit(1);
    }
    preflight();
    await generate(path.resolve(repoPath));
    return;
  }

  if (cmd === 'open') {
    await open();
    return;
  }

  // ramp <repo> — convenience path
  const repoPath = path.resolve(cmd);
  if (!fs.existsSync(repoPath)) {
    console.error(`ramp: path not found: ${repoPath}`);
    console.error('Usage: ramp generate <repo-path> | ramp open | ramp <repo-path>');
    process.exit(1);
  }

  const manifestPath = path.join(repoPath, 'ramp-manifest.json');
  const hasManifest  = fs.existsSync(manifestPath) && manifestUpToDate(repoPath, manifestPath);

  if (hasManifest) {
    console.log(`✓ Manifest already exists for current commit — skipping generation`);
    await open(repoPath);
  } else {
    preflight();
    await generate(repoPath);
    await open(repoPath);
  }
}

// ─── manifest cache check ────────────────────────────────────────────────────

function manifestUpToDate(repoPath, manifestPath) {
  try {
    const { execSync } = require('child_process');
    const currentCommit = execSync('git rev-parse --short HEAD', { cwd: repoPath })
      .toString().trim();
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return manifest?.repo?.commit === currentCommit;
  } catch (_) {
    return false;
  }
}

// ─── help ────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
ramp — developer onboarding certification tool

Usage:
  ramp generate <repo>   Generate a curriculum manifest for a repository
  ramp open              Start the Ramp server and open the browser
  ramp <repo>            Generate (if needed) then open — the typical workflow

Environment variables (set in .env or shell):
  RAMP_SERVER_PORT       Port for the local server (default: 4000)
  BOB_PATH               Path to the bob CLI if not on PATH (optional)
`.trim());
}

main().catch(err => {
  console.error('ramp: unexpected error —', err.message);
  process.exit(1);
});
