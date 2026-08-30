'use strict'

const { CloudantV1 } = require('@ibm-cloud/cloudant')
const { IamAuthenticator } = require('ibm-cloud-sdk-core')
const fs = require('fs')
const path = require('path')

const DB_PROGRESS = process.env.CLOUDANT_DB_PROGRESS || 'ramp-progress'

// Local JSON fallback directory — used when Cloudant is unreachable (demo insurance)
const FALLBACK_DIR = path.join(__dirname, '..', 'data', 'fallback')

let client = null

function getClient() {
  if (client) return client
  if (!process.env.CLOUDANT_URL || !process.env.CLOUDANT_APIKEY) {
    return null
  }
  client = CloudantV1.newInstance({
    authenticator: new IamAuthenticator({ apikey: process.env.CLOUDANT_APIKEY }),
    serviceUrl: process.env.CLOUDANT_URL,
  })
  return client
}

// ---------------------------------------------------------------------------
// Fallback helpers — read/write to local JSON files when Cloudant is down
// ---------------------------------------------------------------------------

function fallbackPath(userId) {
  return path.join(FALLBACK_DIR, `${userId}.json`)
}

function readFallback(userId) {
  try {
    const p = fallbackPath(userId)
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'))
    }
  } catch (err) {
    console.warn('[cloudant] fallback read error:', err.message)
  }
  return null
}

function writeFallback(userId, doc) {
  try {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true })
    fs.writeFileSync(fallbackPath(userId), JSON.stringify(doc, null, 2))
  } catch (err) {
    console.warn('[cloudant] fallback write error:', err.message)
  }
}

// ---------------------------------------------------------------------------
// Progress document helpers
// ---------------------------------------------------------------------------

const EMPTY_PROGRESS = (userId, repoId) => ({
  userId,
  repoId,
  xp: 0,
  level: 'Visitor',
  certifications: [],
  badges: [],
  quests: {},
  quizHistory: {},
  explainBackHistory: {},
  contributionLedger: [],
  startedAt: null,
  lastActiveAt: null,
})

/**
 * Returns the Cloudant document ID for a user's progress.
 * Scoped per user so multiple users coexist in one database.
 */
function progressDocId(userId) {
  return `progress:${userId}`
}

/**
 * Reads a user's progress document. Returns a zeroed-out starting state
 * if the document does not exist — Dev 2 never handles a missing user (FR-4.2).
 * Falls back to local JSON if Cloudant is unreachable.
 */
async function getProgress(userId, repoId) {
  const db = getClient()

  if (!db) {
    console.warn('[cloudant] no client — using fallback')
    return readFallback(userId) || EMPTY_PROGRESS(userId, repoId)
  }

  try {
    const res = await db.getDocument({ db: DB_PROGRESS, docId: progressDocId(userId) })
    const doc = res.result
    // Strip Cloudant internal fields before returning to client
    const { _id, _rev, ...progress } = doc
    return progress
  } catch (err) {
    if (err.status === 404) {
      return EMPTY_PROGRESS(userId, repoId)
    }
    console.warn('[cloudant] getProgress error — using fallback:', err.message)
    return readFallback(userId) || EMPTY_PROGRESS(userId, repoId)
  }
}

/**
 * Writes (upserts) a user's progress document to Cloudant.
 * Handles the _rev required for updates automatically.
 * Writes to local fallback if Cloudant is unreachable.
 */
async function saveProgress(userId, progressData) {
  const db = getClient()

  // Always write fallback so local state is never lost
  writeFallback(userId, progressData)

  if (!db) {
    console.warn('[cloudant] no client — saved to fallback only')
    return
  }

  const docId = progressDocId(userId)

  try {
    // Fetch current _rev so Cloudant accepts the update
    let rev
    try {
      const existing = await db.getDocument({ db: DB_PROGRESS, docId })
      rev = existing.result._rev
    } catch (err) {
      if (err.status !== 404) throw err
      // Document doesn't exist yet — create it
    }

    await db.putDocument({
      db: DB_PROGRESS,
      docId,
      document: {
        _id: docId,
        ...(rev ? { _rev: rev } : {}),
        ...progressData,
      },
    })
  } catch (err) {
    console.warn('[cloudant] saveProgress error — fallback already written:', err.message)
  }
}

module.exports = { getProgress, saveProgress }
