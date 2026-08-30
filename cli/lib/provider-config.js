'use strict';

const SUPPORTED_PROVIDERS = new Set(['watsonx', 'bob']);

function resolveProvider(value = process.env.RAMP_GENERATION_PROVIDER) {
  const provider = String(value || 'watsonx').trim().toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(
      `Unsupported RAMP_GENERATION_PROVIDER "${provider}". Use "watsonx" or "bob".`,
    );
  }
  return provider;
}

function requiredEnvironment(provider) {
  if (provider === 'watsonx') return ['WATSONX_API_KEY', 'WATSONX_PROJECT_ID'];
  return ['BOB_API_KEY'];
}

module.exports = { requiredEnvironment, resolveProvider };
