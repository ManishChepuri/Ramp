# Ramp

**Ramp certifies that a developer actually understands an unfamiliar codebase — and makes the codebase better while they learn it.**

Built with IBM Bob, generated at runtime by IBM watsonx.ai, re-runnable against any repository.

---

## The problem

A developer joining an unfamiliar codebase spends days reconstructing knowledge that already exists in the code, commit history, and stale docs. Nobody can tell whether the new dev actually understood anything until they break something in week three. And onboarding is treated as pure cost — the org pays for weeks of ramp-up and gets nothing back.

## The solution

Ramp's generation pipeline was designed and built inside IBM Bob's IDE, using Agent mode and parallel subagents. At runtime, `ramp generate` runs that pipeline through IBM watsonx.ai to analyze any codebase and produce a structured onboarding curriculum, then Ramp verifies comprehension through quizzes, explain-back grading (written and spoken), and a quest board. The developer who knows least about the codebase becomes the one improving its documentation on day one.

> **Bob built the curriculum engine. watsonx.ai generates and grades. Cloudant remembers.**

---

## Quick start

First-time setup (installing dependencies, building the frontend, configuring credentials) is
one-time — see [`SETUP.md`](SETUP.md) for the full walkthrough. Once that's done:

```bash
# Generate the curriculum for a repository
ramp generate ./path/to/repo

# Launch the Ramp interface
ramp open

# Convenience — generate if missing, open immediately if present
ramp ./path/to/repo
```

`ramp` requires `cd cli && npm link` once. Without that, use `node cli/index.js` in place of `ramp`.

---

## Architecture

```
Local repo  →  watsonx.ai runs Bob's pipeline  →  ramp-manifest.json  →  Ramp web app
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

Full setup (installing dependencies in all three project folders, building the frontend once,
configuring both `.env` files) is in [`SETUP.md`](SETUP.md); credential-specific detail is also in
[`ramp-backend/README.md`](ramp-backend/README.md). Once setup is done, the entire workflow is:

```bash
ramp generate ./path/to/repo
ramp open        # starts the backend on http://localhost:3001 and serves the built frontend
```

`ramp open` starts everything — there is no separate frontend or backend server to run manually.

### Iterating on frontend code only

```bash
cd ramp-frontend
npm run dev      # hot-reload dev server on http://localhost:5173, proxies /api to :3001
```

This is a development convenience, not part of normal usage. Use `ramp open` for everything else,
including demos — leaving both servers running at once has caused real bugs in this project when
their configs drifted out of sync.

---

## IBM services used

| Service | Role |
|---|---|
| **IBM Bob IDE** | Agent mode, parallel subagents, document understanding, skills — used to design and build the generation pipeline |
| **IBM Bob Shell** | Optional generation provider (`RAMP_GENERATION_PROVIDER=bob`), invoked non-interactively |
| **watsonx.ai (granite-4-h-small)** | Default runtime engine for `ramp generate` — analyzes any repository and builds the curriculum, and grades explain-back submissions against Bob-authored rubrics |
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
