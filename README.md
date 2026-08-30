# Ramp

**Ramp certifies that a developer actually understands an unfamiliar codebase — and makes the codebase better while they learn it.**

Built with IBM Bob and generated at runtime by IBM watsonx.ai, re-runnable against any local Git repository.

---

## The problem

A developer joining an unfamiliar codebase spends days reconstructing knowledge that already exists in the code, commit history, and stale docs. Nobody can tell whether the new dev actually understood anything until they break something in week three. And onboarding is treated as pure cost — the org pays for weeks of ramp-up and gets nothing back.

## The solution

Ramp generates a structured onboarding curriculum for any codebase using a pipeline designed and built with IBM Bob. At runtime, watsonx.ai analyzes a credential-safe view of the repository, then Ramp verifies comprehension through quizzes, explain-back grading (written and spoken), and a quest board. The developer who knows least about the codebase becomes the one improving its documentation on day one.

> **Bob helped build the curriculum engine. watsonx.ai generates and grades. Cloudant remembers.**

---

## Quick start

```bash
# Configure watsonx.ai generation (never commit the populated .env)
cp .env.example .env

# Generate from a local repository or GitHub clone URL
ramp generate ./path/to/repo
ramp generate https://github.com/owner/repository

# Launch the last generated repository
ramp open

# One command — clone/generate if needed, then open
ramp ./path/to/repo
ramp https://github.com/owner/repository
```

`ramp generate` defaults to IBM watsonx.ai with `ibm/granite-4-h-small`. Set
`WATSONX_API_KEY` and `WATSONX_PROJECT_ID` in the gitignored root `.env`. The CLI scans only
Git-visible text files, excludes credentials, binaries, dependencies, lock files, and oversized
files, and redacts common inline secrets before sending selected content to watsonx.ai.

Bob Shell remains available as an optional provider by setting `RAMP_GENERATION_PROVIDER=bob`
and `BOB_API_KEY`. That path consumes Bobcoins; the default watsonx path does not.

### Differentiator safety

Generated documentation corrections and sabotage cases use complete unified diffs. Validate all
of them without touching the target repository:

```bash
node pipeline/validate-differentiators.js ./path/to/repo ./path/to/ramp-manifest.json
```

The validator copies each target file to a fresh OS temporary directory, applies the patch only
there, and verifies the real source file's SHA-256 hash is unchanged.

### Sealed demo preparation

Dev 1 can generate and validate a recording fallback without placing the demo source in Ramp:

```bash
cd cli
node index.js prepare-demo <private-local-path-or-public-git-url>
```

Remote sources are shallow-cloned to a private OS temporary directory. The command validates the
manifest and every generated diff before atomically writing `fixtures/demo-manifest.json`.

---

## Architecture

```
Local Git repo → safe scanner → watsonx.ai (generation) → ramp-manifest.json → Ramp web app
                                                                                 ↑
                                                        watsonx.ai (grading)
                                                        IBM Cloudant (persistence)
                                                        IBM Speech-to-Text (transcription)
```

| Component | Responsibility |
|---|---|
| `pipeline/` | Curriculum prompts, patch isolation, and optional Bob skill |
| `cli/` | `ramp` CLI, safe repository scanner, and watsonx generation orchestrator |
| `ramp-backend/` | Thin Express server — credential proxy for IBM services |
| `ramp-frontend/` | React + Vite browser app — the full Ramp experience |
| `ramp-server/server.js` | Entry point shim for `ramp open` auto-detection |
| `fixtures/sample-manifest.json` | Real generated manifest from `gothinkster/node-express-realworld-example-app` |

---

## Running locally

### Backend

```bash
cd ramp-backend
cp .env.example .env    # fill in IBM Cloud credentials
npm install
npm run dev             # starts on http://localhost:3001
```

See [`ramp-backend/README.md`](ramp-backend/README.md) for full credential setup instructions.

### Frontend (development)

```bash
cd ramp-frontend
npm install
npm run dev             # starts on http://localhost:5173
```

---

## IBM services used

| Service | Role |
|---|---|
| **IBM Bob IDE** | Used to design and implement the repository-analysis pipeline, prompts, CLI, schema, and differentiators |
| **IBM Bob Shell** | Optional legacy generation provider for teams with available Bobcoins |
| **watsonx.ai (granite-4-h-small)** | Generates repository-specific curricula and grades explain-back submissions at runtime |
| **IBM Cloudant** | Persists user progress, certifications, badges, and the contribution ledger |
| **IBM Speech-to-Text** | Transcribes spoken explain-backs — the developer explains the codebase aloud |

---

## Team

| Developer | Role |
|---|---|
| Manish Chepuri | Dev 1 — Pipeline & CLI |
| Gaurinath Subash | Dev 2 — Frontend & Experience |
| Joshua Michael | Dev 3 — Backend & Integrations |

---

## Bob sessions

All Bob task session screenshots are in [`bob_sessions/`](bob_sessions/).

---

## Submission

IBM TechXchange 2026 Pre-conference Dev Day Hackathon
Theme: Build with purpose using IBM Bob 2.0
