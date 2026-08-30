'use strict'

const fetch = require('node-fetch')

// IAM tokens expire after 60 minutes. Refresh 5 minutes early to avoid
// mid-request expiry.
const TOKEN_TTL_MS = 55 * 60 * 1000

let cachedToken = null
let tokenExpiresAt = 0

/**
 * Returns a valid IAM access token, fetching a new one when the cached
 * token is expired or absent.
 */
async function getIAMToken(apiKey) {
  const now = Date.now()
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken
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
  cachedToken = data.access_token
  tokenExpiresAt = now + TOKEN_TTL_MS
  return cachedToken
}

module.exports = { getIAMToken }
