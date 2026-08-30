'use strict'

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const multer = require('multer')

const { gradeExplanation } = require('./watsonx')
const { getProgress, saveProgress } = require('./cloudant')
const { transcribeAudio } = require('./stt')

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors())
app.use(express.json())

// Serve the built frontend. Falls back gracefully if dist doesn't exist yet
// (during development, the frontend runs on its own Vite dev server).
const frontendDist = path.resolve(process.env.FRONTEND_DIST || '../ramp-frontend/dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
}

// ---------------------------------------------------------------------------
// GET /api/manifest
// Serves the ramp-manifest.json. Reads from the path in MANIFEST_PATH env var,
// defaulting to the shared fixture. Dev 2's ManifestContext.jsx will switch
// from importing the file directly to calling this endpoint at Sync 3.
// ---------------------------------------------------------------------------

app.get('/api/manifest', (req, res) => {
  const manifestPath = path.resolve(
    process.env.MANIFEST_PATH || '../fixtures/sample-manifest.json'
  )

  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: 'Manifest not found. Run ramp generate first.' })
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    res.json(manifest)
  } catch (err) {
    console.error('[manifest] parse error:', err.message)
    res.status(500).json({ error: 'Failed to read manifest.' })
  }
})

// ---------------------------------------------------------------------------
// POST /api/grade
// Receives explanation + rubric from Dev 2's useExplainBack.js hook.
// Calls watsonx.ai and returns structured assessment.
// Returns degraded shape if watsonx is unavailable (FR-3.7).
// ---------------------------------------------------------------------------

app.post('/api/grade', async (req, res) => {
  const { moduleId, explanation, rubric } = req.body

  if (!explanation || !Array.isArray(rubric) || rubric.length === 0) {
    return res.status(400).json({ error: 'explanation and rubric are required' })
  }

  const result = await gradeExplanation(explanation, rubric)
  res.json(result)
})

// ---------------------------------------------------------------------------
// POST /api/transcribe
// Receives audio blob from Dev 2's useAudioRecorder.js hook.
// Calls IBM Speech-to-Text and returns the transcript.
// Always returns 200 — error details go in the response body (per api-contract.md).
// ---------------------------------------------------------------------------

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.json({ transcript: '', error: 'No audio file received.' })
  }

  const mimeType = req.file.mimetype || 'audio/webm'
  const result = await transcribeAudio(req.file.buffer, mimeType)
  res.json(result)
})

// ---------------------------------------------------------------------------
// GET /api/progress/:userId
// Returns the developer's full progress document.
// Returns a zeroed-out starting state for new users — never a 404 (per api-contract.md).
// ---------------------------------------------------------------------------

app.get('/api/progress/:userId', async (req, res) => {
  const { userId } = req.params
  const repoId = req.query.repoId || 'unknown'

  try {
    const progress = await getProgress(userId, repoId)
    res.json(progress)
  } catch (err) {
    console.error('[progress] GET error:', err.message)
    res.status(500).json({ error: 'Failed to load progress.' })
  }
})

// ---------------------------------------------------------------------------
// POST /api/progress/:userId
// Writes the full progress object back to Cloudant.
// Dev 2 posts the whole state object after every action (per api-contract.md).
// ---------------------------------------------------------------------------

app.post('/api/progress/:userId', async (req, res) => {
  const { userId } = req.params
  const progressData = req.body

  if (!progressData || typeof progressData !== 'object') {
    return res.status(400).json({ ok: false, error: 'Invalid progress data.' })
  }

  try {
    await saveProgress(userId, progressData)
    res.json({ ok: true })
  } catch (err) {
    console.error('[progress] POST error:', err.message)
    res.status(500).json({ ok: false, error: 'Failed to persist progress. Your session data is safe locally.' })
  }
})

// ---------------------------------------------------------------------------
// Catch-all — serve the frontend SPA for any unmatched route
// (only active when the dist folder exists)
// ---------------------------------------------------------------------------

if (fs.existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Ramp backend running on http://localhost:${PORT}`)
  console.log(`  Manifest: ${path.resolve(process.env.MANIFEST_PATH || '../fixtures/sample-manifest.json')}`)
  console.log(`  Frontend: ${fs.existsSync(frontendDist) ? frontendDist : '(not built — run frontend dev server separately)'}`)
  console.log(`  Cloudant: ${process.env.CLOUDANT_URL ? 'configured' : 'NOT configured — using local fallback'}`)
  console.log(`  watsonx:  ${process.env.WATSONX_API_KEY ? 'configured' : 'NOT configured — grading will degrade'}`)
  console.log(`  STT:      ${process.env.STT_APIKEY ? 'configured' : 'NOT configured — transcription disabled'}`)
})

module.exports = app
