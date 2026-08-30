# Ramp Backend

Thin Express server for the Ramp developer onboarding tool.
Proxies IBM watsonx.ai (grading), IBM Cloudant (persistence), and IBM Speech-to-Text (transcription).
Serves the built React frontend as static files.

---

## Prerequisites

- Node.js 18 or later
- An active IBM Cloud account with the following services provisioned:
  - **watsonx.ai** — project with `ibm/granite-4-h-small` available
  - **IBM Cloudant** — Lite instance with two databases: `ramp-progress` and `ramp-manifests`
  - **IBM Speech-to-Text** — Lite instance

---

## Setup

```bash
cd ramp-backend
cp .env.example .env       # fill in your credentials (see below)
npm install
```

---

## Environment variables

All credentials are read from `ramp-backend/.env`. Never commit this file — it is gitignored.

| Variable | Required | Description |
|---|---|---|
| `WATSONX_API_KEY` | Yes | IBM Cloud platform API key (from cloud.ibm.com/iam/apikeys) |
| `WATSONX_PROJECT_ID` | Yes | watsonx.ai project ID (from project → Manage tab) |
| `WATSONX_URL` | No | watsonx.ai regional URL. Default: `https://us-south.ml.cloud.ibm.com` |
| `CLOUDANT_URL` | Yes | Cloudant instance URL (from service credentials) |
| `CLOUDANT_APIKEY` | Yes | Cloudant API key (from service credentials → `apikey` field) |
| `CLOUDANT_DB_PROGRESS` | No | Progress database name. Default: `ramp-progress` |
| `CLOUDANT_DB_MANIFESTS` | No | Manifests database name. Default: `ramp-manifests` |
| `STT_APIKEY` | Yes | Speech-to-Text API key (from instance → Manage) |
| `STT_URL` | Yes | Speech-to-Text regional URL (from instance → Manage) |
| `PORT` | No | Server port. Default: `3001` |
| `FRONTEND_DIST` | No | Path to built frontend. Default: `../ramp-frontend/dist` |
| `MANIFEST_PATH` | No | Path to manifest JSON. Default: `../fixtures/sample-manifest.json` |

**Degradation behaviour:** if any IBM service credential is missing, the affected endpoint degrades
gracefully — grading falls back to the MCQ path, transcription returns an error message, Cloudant
falls back to local JSON files in `data/fallback/`.

---

## Running

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:3001` and logs which services are configured.

---

## API endpoints

### `GET /api/manifest`
Returns the full `ramp-manifest.json`. Path is set via `MANIFEST_PATH` env var.

### `POST /api/grade`
Grades a developer's free-text explanation against a module rubric using watsonx.ai.

**Request body:**
```json
{
  "moduleId": "auth",
  "explanation": "string — developer's typed or transcribed explanation",
  "rubric": [
    { "concept": "string", "weight": 1, "mustMention": ["keyword"] }
  ]
}
```

**Response (200):**
```json
{
  "score": 72,
  "covered": ["concept strings addressed"],
  "missed": ["concept strings absent"],
  "misconceptions": ["incorrect statements — empty if none"],
  "feedback": "Human-readable summary"
}
```

**Degraded response** (watsonx unavailable):
```json
{ "score": null, "covered": [], "missed": [], "misconceptions": [], "feedback": "...", "degraded": true }
```

### `POST /api/transcribe`
Transcribes audio via IBM Speech-to-Text. Always returns 200.

**Request:** `multipart/form-data` with field `audio` (WAV or WebM blob)

**Response:**
```json
{ "transcript": "transcribed text" }
```
or on failure:
```json
{ "transcript": "", "error": "Transcription failed. Please type your explanation instead." }
```

### `GET /api/progress/:userId`
Returns a developer's full progress document. Returns a zeroed-out starting state for new users — never a 404.

**Query param:** `?repoId=reponame@commit` (used to scope new-user documents)

### `POST /api/progress/:userId`
Writes the full progress object to Cloudant. Dev 2 posts the whole state after every action.

**Response:** `{ "ok": true }` or `{ "ok": false, "error": "..." }`

---

## Sync 3 — wiring the frontend

At Sync 3, Dev 2 swaps these four mock lines in the frontend hooks for real fetch calls:

| File | Replace | With |
|---|---|---|
| `ManifestContext.jsx` | `import manifest from '../fixtures/...'` | `fetch('/api/manifest')` |
| `ProgressContext.jsx` | local React state | `fetch('/api/progress/${userId}?repoId=${repoId}')` / `fetch('/api/progress/${userId}', { method: 'POST', ... })` |
| `useExplainBack.js` | `setTimeout` mock | `fetch('/api/grade', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ moduleId, explanation, rubric }) })` |
| `useAudioRecorder.js` | `setTimeout` mock | `fetch('/api/transcribe', { method: 'POST', body: formData })` where `formData` has field `audio` |

---

## ramp CLI integration

`ramp open` (Dev 1's CLI) auto-detects `ramp-server/server.js` at the repo root and starts it,
passing `RAMP_MANIFEST_PATH` and `PORT` as env vars. The `ramp-server/server.js` shim forwards
these into the backend automatically.
