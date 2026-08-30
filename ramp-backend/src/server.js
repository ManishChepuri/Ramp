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
const { getRepoRoot, readRepoFile } = require('./repo')
const { verifyFix, patchContent } = require('./sabotage-verify')

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

function manifestPath() {
  return path.resolve(process.env.MANIFEST_PATH || '../fixtures/sample-manifest.json')
}

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath(), 'utf8'))
}

function findSabotage(manifest, moduleId, sabotageId) {
  const module = (manifest.modules || []).find(m => m.id === moduleId)
  if (!module) return {}
  const list = module.sabotage || []
  const sab = sabotageId
    ? list.find(s => s.id === sabotageId)
    : list[0]
  return { module, sab }
}

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
  if (!fs.existsSync(manifestPath())) {
    return res.status(404).json({ error: 'Manifest not found. Run ramp generate first.' })
  }

  try {
    res.json(readManifest())
  } catch (err) {
    console.error('[manifest] parse error:', err.message)
    res.status(500).json({ error: 'Failed to read manifest.' })
  }
})

// ---------------------------------------------------------------------------
// Integrated IDE — read-only access to the cloned repository.
//
// `ramp generate` clones the target repo alongside the manifest; these routes
// serve source files from that checkout so the frontend can show the code the
// developer is studying (Module view) or debugging (Sabotage view). When Ramp
// has only the fixture manifest (no checkout), `available` is false and the
// frontend shows a "run ramp generate" state instead of the editor.
// ---------------------------------------------------------------------------

app.get('/api/repo/meta', (req, res) => {
  const root = getRepoRoot()
  res.json({ available: !!root, name: root ? path.basename(root) : null })
})

app.get('/api/repo/file', (req, res) => {
  try {
    res.json(readRepoFile(req.query.path))
  } catch (err) {
    const status = err.code === 'NO_REPO' ? 409
      : err.code === 'NOT_FOUND' ? 404
      : err.code === 'BAD_PATH' ? 400 : 500
    if (status === 500) console.error('[repo/file] error:', err.message)
    res.status(status).json({ error: err.message, code: err.code || 'ERROR' })
  }
})

// The file as the developer sees it in Sabotage mode: pristine source with the
// injected defect applied in-memory (the checkout on disk is never mutated).
app.get('/api/sabotage/:moduleId/:sabotageId/file', (req, res) => {
  try {
    const { moduleId, sabotageId } = req.params
    const { sab } = findSabotage(readManifest(), moduleId, sabotageId)
    if (!sab) return res.status(404).json({ error: 'Sabotage case not found.' })

    const source = readRepoFile(sab.file)
    const buggy = patchContent(source.content, sab.injectedDiff, { reverse: false })
    if (buggy == null) {
      return res.status(500).json({ error: 'Could not apply the injected diff to the source file.' })
    }
    res.json({ path: source.path, language: source.language, content: buggy, pristineBytes: source.bytes })
  } catch (err) {
    const status = err.code === 'NO_REPO' ? 409 : err.code === 'NOT_FOUND' ? 404 : 500
    if (status === 500) console.error('[sabotage/file] error:', err.message)
    res.status(status).json({ error: err.message, code: err.code || 'ERROR' })
  }
})

// Verify a submitted fix in an isolated scratch copy (see sabotage-verify.js).
app.post('/api/sabotage/verify', (req, res) => {
  const { moduleId, sabotageId, file, content, quick } = req.body || {}

  const root = getRepoRoot()
  if (!root) {
    return res.json({
      passed: false,
      method: 'unavailable',
      detail: 'Ramp has no repository checkout to test against. Run `ramp generate <repo>` and reopen.',
    })
  }

  let sab
  try {
    ({ sab } = findSabotage(readManifest(), moduleId, sabotageId))
  } catch (err) {
    return res.status(500).json({ passed: false, method: 'error', detail: 'Could not read the manifest.' })
  }
  if (!sab) return res.status(404).json({ passed: false, method: 'error', detail: 'Sabotage case not found.' })
  if (file && file !== sab.file) {
    return res.status(400).json({ passed: false, method: 'error', detail: 'Submitted file does not match the sabotage target.' })
  }

  try {
    res.json(verifyFix({ repoRoot: root, sabotageCase: sab, userContent: content, quick: !!quick }))
  } catch (err) {
    console.error('[sabotage/verify] error:', err.message)
    res.status(500).json({ passed: false, method: 'error', detail: 'Verification failed to run.' })
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
    console.warn('[transcribe] no "audio" file field in the request')
    return res.json({ transcript: '', error: 'No audio file received.' })
  }

  const mimeType = req.file.mimetype || 'audio/webm'
  console.log(`[transcribe] received ${req.file.size} bytes (${mimeType})`)
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
