'use strict';
/**
 * preflight.js — verify the selected generation provider and its credentials
 * before starting generation. Fails loudly with actionable messages (K7, FR-6.8).
 */

const { execFileSync } = require('child_process');
const { requiredEnvironment, resolveProvider } = require('./provider-config');

function preflight(options = {}) {
  console.log('\n→ Running preflight checks...');
  const provider = resolveProvider(options.provider);

  if (provider === 'bob') {
    const bobCmd = process.env.BOB_PATH || 'bob';
    try {
      execFileSync(bobCmd, ['--version'], { stdio: 'pipe' });
      console.log('  ✓ Bob Shell found');
    } catch (_) {
      throw new Error(
        'Bob Shell was not found. Install it or set BOB_PATH=/path/to/bob in Ramp/.env.',
      );
    }
  }

  const missing = requiredEnvironment(provider).filter(variable => !process.env[variable]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing ${provider} environment variable(s): ${missing.join(', ')}. ` +
      'Add them to Ramp/.env; never commit that file.',
    );
  }

  if (provider === 'watsonx') {
    const url = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') throw new Error('not HTTPS');
    } catch (_) {
      throw new Error('WATSONX_URL must be a valid HTTPS URL');
    }
  }

  console.log(`  ✓ Provider: ${provider}`);
  console.log('  ✓ Required environment variables set');
  console.log('  ✓ Preflight passed\n');
  return provider;
}

module.exports = { preflight };
