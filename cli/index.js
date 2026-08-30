#!/usr/bin/env node
/**
 * ramp CLI — entry point
 *
 * Commands:
 *   ramp generate <repo>   — run the configured provider, write ramp-manifest.json
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
const { prepareDemo } = require('./lib/prepare-demo');
const {
  isGitHubUrl,
  loadLastRepository,
  rememberRepository,
  resolveRepositorySource,
} = require('./lib/repository-source');

const [,, cmd, ...args] = process.argv;

// ─── dispatch ────────────────────────────────────────────────────────────────

async function main() {
  if (!cmd || cmd === '--help' || cmd === '-h') {
    printHelp();
    return;
  }

  if (cmd === 'generate') {
    const source = args[0];
    if (!source) {
      console.error('Usage: ramp generate <repo-path-or-github-url> [--open]');
      process.exit(1);
    }
    const provider = preflight();
    const resolved = await resolveRepositorySource(source, { logger: console });
    const manifestPath = await generate(resolved.repoPath, { provider });
    rememberRepository(resolved, manifestPath);
    console.log(`  next     : ramp open`);
    if (args.includes('--open')) await open(resolved.repoPath);
    return;
  }

  if (cmd === 'open') {
    const source = args[0];
    if (source) {
      const resolved = await resolveRepositorySource(source, { refresh: false, logger: console });
      const manifestPath = path.join(resolved.repoPath, 'ramp-manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error(`No generated manifest found for ${source}. Run ramp generate first.`);
      }
      rememberRepository(resolved, manifestPath);
      await open(resolved.repoPath);
    } else {
      const last = loadLastRepository();
      if (last) {
        console.log(`✓ Opening last generated repository: ${path.basename(last.repoPath)}`);
        await open(last.repoPath);
      } else {
        console.log('  No previous generated repository found; opening the bundled fixture.');
        await open();
      }
    }
    return;
  }

  if (cmd === 'prepare-demo') {
    const source = args[0];
    if (!source) {
      console.error('Usage: ramp prepare-demo <git-url-or-local-repo>');
      process.exit(1);
    }
    const provider = preflight();
    await prepareDemo(source, { provider });
    return;
  }

  // ramp <repo> — convenience path
  if (/^https?:\/\//.test(cmd) && !isGitHubUrl(cmd)) {
    throw new Error('Use a GitHub repository clone URL such as https://github.com/owner/repository');
  }
  const resolved = await resolveRepositorySource(cmd, { logger: console });
  const repoPath = resolved.repoPath;

  const manifestPath = path.join(repoPath, 'ramp-manifest.json');
  const hasManifest  = fs.existsSync(manifestPath) && manifestUpToDate(repoPath, manifestPath);

  if (hasManifest) {
    console.log(`✓ Manifest already exists for current commit — skipping generation`);
    rememberRepository(resolved, manifestPath);
    await open(repoPath);
  } else {
    const provider = preflight();
    const generatedPath = await generate(repoPath, { provider });
    rememberRepository(resolved, generatedPath);
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
  ramp generate <source> [--open]
                         Generate from a local path or GitHub URL
  ramp prepare-demo <source>
                         Clone/generate a sealed demo and write the fallback fixture
  ramp open [source]     Open a source, or the last generated repository
  ramp <source>          Generate (if needed) then open — the typical workflow

Environment variables (set in .env or shell):
  RAMP_GENERATION_PROVIDER  watsonx (default) or bob
  WATSONX_API_KEY           IBM Cloud API key required by watsonx
  WATSONX_PROJECT_ID        watsonx.ai project ID
  WATSONX_URL               Region URL (default: https://us-south.ml.cloud.ibm.com)
  WATSONX_MODEL_ID          Model (default: ibm/granite-4-h-small)
  BOB_API_KEY            Bob Shell API key (only when provider=bob)
  BOB_TEAM_ID            Team ID when using a general Bob API key (optional)
  BOB_MAX_COST           Optional per-generation Bobcoin limit
  BOB_MAX_TURNS          Optional per-generation turn limit
  RAMP_SERVER_PORT       Port for the local server (default: 3001)
  BOB_PATH               Path to the bob CLI if not on PATH (optional)
`.trim());
}

main().catch(err => {
  console.error('ramp: unexpected error —', err.message);
  process.exit(1);
});
