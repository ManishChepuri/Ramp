# Ramp

**Ramp certifies that a developer actually understands an unfamiliar codebase — and makes the codebase better while they learn it.**

Generated end-to-end by IBM Bob, re-runnable against any repository.

---

## The problem

A developer joining an unfamiliar codebase spends days reconstructing knowledge that already exists in the code, commit history, and stale docs. Nobody can tell whether the new dev actually understood anything until they break something in week three. And onboarding is treated as pure cost — the org pays for weeks of ramp-up and gets nothing back.

## The solution

Ramp generates a structured onboarding curriculum for any codebase using IBM Bob's agent pipeline, then verifies comprehension through quizzes, explain-back grading (written and spoken), and a quest board. The developer who knows least about the codebase becomes the one improving its documentation on day one.

> **Bob authors the curriculum. watsonx.ai grades the developer against it. Cloudant remembers.**

---

## Quick start

```bash
# Generate the curriculum for a repository
ramp generate ./path/to/repo

# Launch the Ramp interface
ramp open

# Convenience — generate if missing, open immediately if present
ramp ./path/to/repo
```

---

## Architecture

```
IBM Bob (generation)  →  ramp-manifest.json  →  Ramp web app
                                                      ↑
                                          watsonx.ai (grading)
                                          IBM Cloudant (persistence)
                                          IBM Speech-to-Text (transcription)
```

| Component | Responsibility |
|---|---|
| `pipeline/` | Bob skill and subagent prompts — generates the manifest |
| `cli/` | `ramp` CLI entry point — orchestrates generation and serving |
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
| **IBM Bob IDE** | Agent mode, parallel subagents, document understanding, skills — generates the entire curriculum |
| **IBM Bob Shell** | Non-interactive invocation by `ramp generate` — makes Bob a runtime component |
| **watsonx.ai (granite-4-h-small)** | Grades explain-back submissions at runtime against Bob-authored rubrics |
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
