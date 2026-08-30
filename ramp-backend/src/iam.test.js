'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const Module = require('module')

// Stub node-fetch in the require cache before iam.js pulls it in, so we can
// count IAM token requests without hitting the network.
const fetchPath = require.resolve('node-fetch')
let calls = []
require.cache[fetchPath] = new Module(fetchPath)
require.cache[fetchPath].exports = async (url, opts) => {
  calls.push(opts.body)
  return {
    ok: true,
    json: async () => ({ access_token: 'tok-for-' + opts.body.split('apikey=')[1] }),
  }
}

const { getIAMToken } = require(path.join(__dirname, 'iam'))

test('caches one token per API key, not globally', async () => {
  calls = []
  const a1 = await getIAMToken('KEY_A')
  const a2 = await getIAMToken('KEY_A')      // cached — no second request
  const b1 = await getIAMToken('KEY_B')      // different key — new request

  assert.equal(a1, 'tok-for-KEY_A')
  assert.equal(a2, 'tok-for-KEY_A')
  assert.equal(b1, 'tok-for-KEY_B')
  assert.notEqual(a1, b1, 'each key must get its own token')
  assert.equal(calls.length, 2, 'one IAM request per distinct key')
})

test('rejects a missing API key instead of caching undefined', async () => {
  await assert.rejects(() => getIAMToken(''), /without an API key/)
})
