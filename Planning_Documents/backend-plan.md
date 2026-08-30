# Ramp — Backend Implementation Plan (Dev 3)

> **Screenshot reminder:** Take a Bob task session screenshot immediately after every sub-task completes. Open Bob IDE → Tasks → click the task header → screenshot the consumption summary. Save to `bob_sessions/` as `ramp_dev3_taskNN_description.png`. Do not wait until the end — Bob access ends September 1.

## Overview

**Who:** Joshua Michael — Dev 3, Backend & Integrations
**Branch:** `Joshua_Michael---Backend-&-Integrations`
**Companion docs:** `ramp-team-task-plan.md`, `ramp-feature-map-and-requirements.md`, `docs/api-contract.md`

Build the thin backend server that sits between Dev 2's React frontend and the three IBM Cloud services
(watsonx.ai, Cloudant, Speech-to-Text). The server has exactly four API endpoints, holds all credentials
server-side, and serves the built frontend as static files.

**The contract between this backend and Dev 2's frontend is locked in `docs/api-contract.md`.
Any change to an endpoint shape requires a BOB_COMMS.md entry tagged to Dev 2 before implementing.**

---

## What is already written

These files exist and are correct. The plan picks up from here — do not rewrite them.

| File | What it does |
|---|---|
| `ramp-backend/package.json` | Dependencies: express, cors, dotenv, multer, node-fetch, @ibm-cloud/cloudant |
| `ramp-backend/.env.example` | Credential template — all IBM service keys and paths |
| `ramp-backend/src/iam.js` | IAM token cache — fetches and refreshes the 60-min IBM Cloud token |
| `ramp-backend/src/watsonx.js` | watsonx.ai grading — prompt builder, JSON validation, retry, graceful degradation |
| `ramp-backend/src/cloudant.js` | Cloudant progress read/write — upsert with `_rev` handling, local JSON fallback |
| `ramp-backend/src/stt.js` | Speech-to-Text — audio buffer → transcript, always 200 |
| `ramp-backend/src/server.js` | Express server — all 4 endpoints wired, static serving, SPA catch-all |

**Still needed:** `.gitignore`, `npm install`, Cloudant database provisioning, README, credential
wiring, end-to-end smoke test, BOB_COMMS entry for Dev 2, commit and push.

---

## Sub-Tasks

---

### Sub-Task 1 — Project hygiene and install

**Intent**
Ensure the backend project is safe to commit (no credentials ever land in git), dependencies are
installed, and the fallback data directory exists.

**Expected Outcomes**
- `ramp-backend/.gitignore` exists and excludes `node_modules/`, `.env`, `data/fallback/`, `*.log`
- `ramp-backend/node_modules/` is installed
- `ramp-backend/data/fallback/` directory exists (gitignored — holds local progress fallback files)
- Running `node src/server.js` without a `.env` starts without crashing (all IBM services degrade gracefully)

**Todo List**
- [ ] Create `ramp-backend/.gitignore` via shell command (write_file is blocked by .bobignore)
- [ ] Create `ramp-backend/data/fallback/.gitkeep` to ensure the fallback directory exists in git
- [ ] Run `npm install` inside `ramp-backend/`
- [ ] Copy `.env.example` to `.env` and confirm the server starts cleanly without credentials (all services should log warnings, not crash)

**Relevant Context**
- The `.bobignore` in the repo root blocks `write_file` for `.gitignore` files — must use `execute_command` with `printf` or `echo`
- `cloudant.js` and `watsonx.js` already check for missing env vars and degrade gracefully — the server must start even with an empty `.env`
- `data/fallback/` is where local JSON progress files are written when Cloudant is unreachable — this is the demo insurance path

**Status:** [ ] pending

---

### Sub-Task 2 — Provision IBM Cloud services

**Intent**
Set up the three IBM Cloud services needed at runtime and capture their credentials into `.env`.
None of this involves writing code — it is console and credential work only.

**Expected Outcomes**
- watsonx.ai: project ID and API key in `.env`, verified by calling the inference endpoint manually
- Cloudant: instance created, two databases (`ramp-progress`, `ramp-manifests`) created, API key in `.env`
- Speech-to-Text: service instance created, API key and URL in `.env`
- All three credentials confirmed to work before any code depends on them

**Todo List**
- [ ] In IBM Cloud console: create or locate a watsonx.ai project, copy the Project ID into `.env` as `WATSONX_PROJECT_ID`
- [ ] Generate an IBM Cloud API key (not a service key — a platform API key), add to `.env` as `WATSONX_API_KEY`
- [ ] Confirm the chosen model (`ibm/granite-13b-instruct-v2`) is NOT on the out-of-scope list: `llama-3-405b-instruct`, `mistral-medium-2505`, `mistral-small-3-1-24b-instruct-2503`
- [ ] In IBM Cloud console: create a Cloudant Lite instance, copy the URL and API key into `.env`
- [ ] Create two Cloudant databases: `ramp-progress` and `ramp-manifests` (via Cloudant dashboard or curl)
- [ ] In IBM Cloud console: create a Speech-to-Text Lite instance, copy the API key and URL into `.env`
- [ ] Smoke-test each service: run the server with real credentials and hit each endpoint once manually

**Relevant Context**
- IBM Cloud budget is $80 — use Lite tiers for Cloudant and STT, they are free within limits
- Grading calls are trivially cheap: 1,000 tokens = 1 RU = $0.0001 — not a cost risk
- **Never commit `.env`** — the `.gitignore` from Sub-Task 1 must exist before this step
- The IBM Cloud account is a shared team account — confirm it is active before spending time on this

**Status:** [ ] pending

---

### Sub-Task 3 — Verify endpoint contracts match Dev 2's hooks exactly

**Intent**
Before Dev 2 wires their frontend to the real backend at Sync 3, confirm the server's response
shapes match what Dev 2's mock hooks produce. Any mismatch found here is cheap to fix; the same
mismatch found at Sync 3 blocks both tracks.

**Expected Outcomes**
- `POST /api/grade` response shape matches `useExplainBack.js` mock exactly: `{ score, covered[], missed[], misconceptions[], feedback }`
- `POST /api/transcribe` response shape matches `useAudioRecorder.js` mock exactly: `{ transcript }` or `{ transcript: '', error }`
- `GET /api/progress/:userId` new-user response matches `ProgressContext.jsx` initial state shape
- `POST /api/progress/:userId` returns `{ ok: true }` on success
- `GET /api/manifest` returns the full fixture JSON
- Degraded grade response includes `degraded: true` — Dev 2 checks this flag

**Todo List**
- [ ] Read `ramp-frontend/src/hooks/useExplainBack.js` — confirm the fields it reads from the grade response match `src/watsonx.js` output
- [ ] Read `ramp-frontend/src/hooks/useAudioRecorder.js` — confirm it reads `result.transcript` and `result.error`
- [ ] Read `ramp-frontend/src/context/ProgressContext.jsx` — confirm the field names and types it expects from `GET /progress/:userId` match `cloudant.js` empty progress shape
- [ ] Read `ramp-frontend/src/context/ManifestContext.jsx` — confirm it can consume the response from `GET /api/manifest` directly
- [ ] Fix any mismatches found — if a field name or shape differs, update the server (not the frontend) and write a BOB_COMMS.md entry tagged to Dev 2

**Relevant Context**
- Dev 2's hooks are in `origin/Gaurinath_Subash---Frontend-&-Experience` branch
- Pull them first: `git fetch origin && git checkout 'origin/Gaurinath_Subash---Frontend-&-Experience' -- ramp-frontend/src/hooks/ ramp-frontend/src/context/`
- The `level` field: Dev 2 computes level client-side from XP — the backend stores and returns whatever level string Dev 2 sends in the POST body. No computation needed server-side.

**Status:** [ ] pending

---

### Sub-Task 4 — End-to-end smoke test with real credentials

**Intent**
Verify the full request path works with real IBM Cloud services before Sync 3. Catches auth issues,
wrong URLs, and model availability problems that only surface with real credentials.

**Expected Outcomes**
- `GET /api/manifest` returns the fixture JSON
- `POST /api/grade` with a real explanation and rubric returns a non-degraded response with all five fields populated
- `POST /api/transcribe` with a real audio file returns a non-empty transcript
- `GET /api/progress/:userId` for a new user returns the empty progress shape
- `POST /api/progress/:userId` writes to Cloudant and the follow-up GET returns the saved data
- Local fallback: with `CLOUDANT_URL` unset, `POST /api/progress/:userId` writes to `data/fallback/` without crashing

**Todo List**
- [ ] Start the server with real credentials: `npm run dev` inside `ramp-backend/`
- [ ] Test `GET /api/manifest` with curl or a browser — confirm full fixture JSON returns
- [ ] Test `POST /api/grade` with a sample explanation and rubric from the fixture
- [ ] Verify the same explanation submitted three times returns materially consistent scores (FR-3.4)
- [ ] Test `POST /api/transcribe` with a short audio file
- [ ] Test `GET /api/progress/test-user` — confirm empty progress shape returns
- [ ] Test `POST /api/progress/test-user` with a sample progress object — confirm `{ ok: true }`
- [ ] Test the Cloudant fallback by temporarily unsetting `CLOUDANT_URL` and verifying `data/fallback/test-user.json` is written

**Relevant Context**
- IAM token is cached in memory — restart the server to force a fresh token fetch if testing auth issues
- The model `ibm/granite-13b-instruct-v2` must be available in your watsonx.ai project — if not, check the model catalog and update `MODEL_ID` in `watsonx.js`
- STT `en-US_BroadbandModel` requires audio sampled at 16kHz minimum — WebM from the browser satisfies this

**Status:** [ ] pending

---

### Sub-Task 5 — Write the backend README and post BOB_COMMS entry

**Intent**
Document how to set up and run the backend so any teammate can get it running in under five minutes.
Post a BOB_COMMS.md entry telling Dev 2 the real backend is live and how to wire their hooks at Sync 3.

**Expected Outcomes**
- `ramp-backend/README.md` covers: prerequisites, setup steps, all env vars, how to run, and the four endpoint shapes
- A BOB_COMMS.md entry tagged to Dev 2 documents the exact swap-in instructions for each hook
- Both files committed and pushed to `Development`

**Todo List**
- [ ] Write `ramp-backend/README.md` with: prerequisites (Node 18+), setup (`cp .env.example .env`, `npm install`), run commands (`npm run dev`), all env var descriptions, and a summary of the four endpoints
- [ ] Write a BOB_COMMS.md entry tagged to Dev 2 with: server URL (`http://localhost:3001`), the four endpoint paths with `/api/` prefix, and the exact lines to change in each hook file
- [ ] Commit: `git add ramp-backend/ BOB_COMMS.md` and push to both personal branch and Development

**Relevant Context**
- Dev 2's swap-in points (from reviewing the hook files in Sub-Task 3):
  - `useExplainBack.js` — replace `setTimeout` mock with `fetch('/api/grade', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ moduleId, explanation, rubric }) })`
  - `useAudioRecorder.js` — replace `setTimeout` mock with `fetch('/api/transcribe', { method: 'POST', body: formData })` where formData has field `audio`
  - `ManifestContext.jsx` — replace fixture import with `fetch('/api/manifest')`
  - `ProgressContext.jsx` — replace local state with `fetch('/api/progress/${userId}?repoId=${repoId}')` for GET and `fetch('/api/progress/${userId}', { method: 'POST', body: JSON.stringify(progress) })` for saves

**Status:** [ ] pending

---

### Sub-Task 6 — Submission deliverables (ongoing — never cut)

**Intent**
Own the submission entirely. All four deliverables must be ready before 10:00 AM ET, August 30, 2026.

**Expected Outcomes**
- Repo is public and the template's `.gitignore` / `.bobignore` are intact
- `bob_sessions/` folder contains screenshots from all three devs, correctly named
- 500-word problem and solution statement drafted
- Bob usage statement drafted, sourced from Section 8 of `ramp-feature-map-and-requirements.md`
- README at repo root written
- Full credential scan run before every push
- Submission dry run completed with enough time to act on AI Advisor feedback

**Todo List**
- [ ] Verify repo is public on GitHub
- [ ] Confirm `.gitignore` and `.bobignore` from IBM's hackathon template are intact — check for any accidental credential exposure
- [ ] Create `bob_sessions/` folder at repo root
- [ ] Collect screenshots from Manish and Gaurinath — verify naming convention: `teamname_devN_taskNN_description.png`
- [ ] Add your own Bob task session screenshots immediately after each session completes
- [ ] Draft the 500-word problem and solution statement (target: onboarding costs, verification gap, codebase improvement)
- [ ] Draft the Bob usage statement — reference Section 8 of `ramp-feature-map-and-requirements.md` specifically: Agent mode (A1), subagents (A2), parallel tasks (A2), document understanding (A4), skills (E1), Bob Shell non-interactive (K1), custom rules (FR-1.9)
- [ ] Write the root `README.md` — one-liner, demo instructions, how to run, team credits
- [ ] Run `git grep -r "apikey\|api_key\|password\|secret\|token" -- '*.js' '*.json' '*.env'` before every push to scan for leaked credentials
- [ ] Submit a draft early enough to receive and act on AI Advisor feedback
- [ ] Final resubmission with all four deliverables before 10:00 AM ET, August 30, 2026

**Relevant Context**
- Resubmission requires re-entering all four deliverables — not just the changed one
- The Bob usage statement must be specific — vague answers score poorly. Section 8 of the feature map has the exact mapping of Bob capability → Ramp feature to cite
- Screenshot every Bob task session **immediately** — access ends September 1, not submission day
- `bob_sessions/` screenshots are one of only four things the automated AI Advisor checks

**Status:** [ ] pending

---

## Cut order if behind

1. Sub-Task 4 partial — skip STT smoke test, keep grade + progress tests
2. Sub-Task 5 README — keep the BOB_COMMS entry, shorten the README
3. **Never cut Sub-Task 6** — the submission is the deliverable

## Execution order

**Sub-Tasks 1 and 3 run in parallel first** — they have no dependencies on each other.
Sub-Task 2 (IBM Cloud provisioning) starts as soon as Sub-Task 1 is done (needs npm installed).
Sub-Task 4 starts only after both Sub-Task 2 and Sub-Task 3 are complete.

```
Sub-Task 1 (hygiene + install) ──┬──→ Sub-Task 2 (IBM Cloud credentials) ──┐
                                  │                                          ├──→ Sub-Task 4 (smoke test) → Sub-Task 5 (README + comms)
Sub-Task 3 (contract check) ──────┘──────────────────────────────────────────┘

Sub-Task 6 (submission deliverables) — runs in parallel with everything, ongoing throughout
```

**📸 Screenshot reminder after every sub-task.**
