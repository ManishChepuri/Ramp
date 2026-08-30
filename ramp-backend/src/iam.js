'use strict'

const fetch = require('node-fetch')

// IAM tokens expire after 60 minutes. Refresh 5 minutes early to avoid
// mid-request expiry.
const TOKEN_TTL_MS = 55 * 60 * 1000

// Tokens are cached PER API KEY. The server authenticates against more than one
// IBM service (watsonx.ai for grading, Speech to Text for transcription) with
// different keys; a single shared token would be handed to the wrong service
// and rejected with 403.
const cache = new Map() // apiKey -> { token, expiresAt }

/**
 * Returns a valid IAM access token for `apiKey`, fetching a new one when the
 * cached token for that key is expired or absent.
 */
async function getIAMToken(apiKey) {
  if (!apiKey) throw new Error('getIAMToken called without an API key')

  const now = Date.now()
  const hit = cache.get(apiKey)
  if (hit && now < hit.expiresAt) {
    return hit.token
  }

  const res = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`IAM token request failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  cache.set(apiKey, { token: data.access_token, expiresAt: now + TOKEN_TTL_MS })
  return data.access_token
}

module.exports = { getIAMToken }
