'use strict';
/**
 * preflight.js — verify Bob Shell is available and required env vars are set
 * before starting generation. Fails loudly with actionable messages (K7, FR-6.8).
 */

const { execFileSync } = require('child_process');

const REQUIRED_ENV = [
  'BOB_API_KEY',
];

function preflight() {
  console.log('\n→ Running preflight checks...');

  // 1. Check bob is on PATH (or BOB_PATH is set)
  const bobCmd = process.env.BOB_PATH || 'bob';
  try {
    execFileSync(bobCmd, ['--version'], { stdio: 'pipe' });
    console.log('  ✓ Bob Shell found');
  } catch (_) {
    console.error(`
✗ Preflight failed: Bob Shell not found.

  ramp generate requires the Bob Shell CLI to be on your PATH.
  Install it from: https://www.ibm.com/products/bob
  Or set BOB_PATH=/path/to/bob in your .env file.
`);
    process.exit(1);
  }

  // 2. Check Bob authentication. IBM Cloud credentials are backend concerns
  // and are not required to generate a manifest.
  const missing = REQUIRED_ENV.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`
✗ Preflight failed: missing environment variable(s):

  ${missing.map(v => `  ${v}=`).join('\n')}

  Add this to your .env file at the Ramp repo root.
  Never commit credentials — .env is gitignored.
`);
    process.exit(1);
  }
  console.log('  ✓ Required environment variables set');
  console.log('  ✓ Preflight passed\n');
}

module.exports = { preflight };
