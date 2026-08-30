'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { requiredEnvironment, resolveProvider } = require('./provider-config');

test('defaults generation to watsonx', () => {
  assert.equal(resolveProvider(''), 'watsonx');
  assert.deepEqual(requiredEnvironment('watsonx'), ['WATSONX_API_KEY', 'WATSONX_PROJECT_ID']);
});

test('supports the optional Bob provider and rejects typos', () => {
  assert.equal(resolveProvider(' BOB '), 'bob');
  assert.deepEqual(requiredEnvironment('bob'), ['BOB_API_KEY']);
  assert.throws(() => resolveProvider('watson'), /Unsupported RAMP_GENERATION_PROVIDER/);
});
