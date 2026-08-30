'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { generate, validateManifest } = require('./generate');
const { validateDifferentiators } = require('../../pipeline/validate-differentiators');

const RAMP_ROOT = path.resolve(__dirname, '..', '..');
const FALLBACK_PATH = path.join(RAMP_ROOT, 'fixtures', 'demo-manifest.json');

async function prepareDemo(source) {
  const demoRepo = isRemoteSource(source) ? await cloneSealedRepo(source) : path.resolve(source);

  console.log(`\n→ Preparing sealed demo repository at ${demoRepo}`);
  const generatedPath = await generate(demoRepo);
  const manifest = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));
  validateManifest(manifest, demoRepo);
  const differentiators = validateDifferentiators(demoRepo, manifest);

  const tempFallback = `${FALLBACK_PATH}.tmp-${process.pid}`;
  fs.writeFileSync(tempFallback, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.renameSync(tempFallback, FALLBACK_PATH);

  console.log('✓ Demo fallback manifest validated and copied');
  console.log(`  sabotage: ${differentiators.sabotageCount}; corrections: ${differentiators.correctionCount}`);
  console.log(`  fallback : ${FALLBACK_PATH}`);
  console.log(`  sealed repo remains local at: ${demoRepo}`);
  return { demoRepo, fallbackPath: FALLBACK_PATH };
}

function cloneSealedRepo(source) {
  return new Promise((resolve, reject) => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ramp-sealed-demo-'));
    const destination = path.join(parent, 'repo');
    const child = spawn('git', ['clone', '--depth', '1', '--quiet', source, destination], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) resolve(destination);
      else reject(new Error(`Could not clone sealed demo repository: ${stderr.trim()}`));
    });
  });
}

function isRemoteSource(source) {
  return /^(https?:\/\/|git@)/.test(source);
}

module.exports = { FALLBACK_PATH, isRemoteSource, prepareDemo };
