# Ramp — Developer Handoff

**Written:** Aug 30, 2026, ~02:15 AM ET, by Claude Code, for whoever picks up Dev 1's track (Pipeline & CLI) next.
**Submission deadline:** 10:00 AM ET, Aug 30, 2026 — **~8 hours left at time of writing.**
**Branch:** `Manish_Chepuri---Pipeline-&-CLI`

Read this top to bottom before touching anything. It covers what Ramp is, exactly what changed in this
session, what's proven working, what's still broken, and what to do next.

---

## 1. What Ramp is

Ramp is a CLI tool + local web app that certifies a developer actually understands an unfamiliar
codebase. Point it at a repo (`ramp generate <repo-or-github-url>`), it generates a curriculum
(module breakdown, architecture diagrams, quizzes, an "explain it back" grading flow, sabotage/bug-hunt
challenges, starter quests), then `ramp open` serves a local web app to work through it.

Three people/tracks (each their own AI-assisted dev track):
- **Dev 1 — Pipeline & CLI** (Manish Chepuri) — this is the track this handoff covers.
- **Dev 2 — Frontend & Experience** (Gaurinath Subash) — `ramp-frontend/`.
- **Dev 3 — Backend & Integrations** (Joshua Michael) — `ramp-backend/`, IBM Cloudant/watsonx/Speech-to-Text.

Team communication convention: **`BOB_COMMS.md`** at repo root is the shared log between the three
dev tracks. Read it — it has locked schema/contract info this doc doesn't repeat. A pointer entry for
this session has been added there.

---

## 2. TL;DR — where things stand right now

- Original design used **IBM Bob Shell** to generate curricula (consumes team "Bobcoins", limited
  budget). This session (continuing from a Codex session that ran out of credits) finished migrating
  `ramp generate` to use **watsonx.ai (`ibm/granite-4-h-small`) by default** instead — free of that
  budget. Bob Shell still works as an opt-in fallback (`RAMP_GENERATION_PROVIDER=bob`).
- The **full pipeline was proven working end-to-end against two different live GitHub repos** this
  session (not just the original test repo) — `gothinkster/node-express-realworld-example-app` and
  `gothinkster/react-redux-realworld-example-app` — via the real `ramp generate <github-url>` →
  `ramp open` workflow, watching the actual watsonx.ai API calls succeed.
- Testing against a **second, structurally different repo surfaced and fixed several real bugs**
  that only showed up outside the original repo (see §4). This is the main value of this session:
  the pipeline is now meaningfully more robust to "any GitHub URL," not just the one repo it was
  built against.
- **33/33 automated tests pass** (`cd cli && npm test`).
- **Git state is messy — fix this first.** One commit (`547e613 "Finished implementing WatsonX.ai"`)
  landed during this session with the three frontend fixes. Everything else from this session —
  all the CLI/pipeline provider work, the bug fixes, the generate.js validation changes — is
  **still uncommitted** in the working tree. See §7.

---

## 3. How to run everything

```bash
cd Ramp

# One-time: env vars (both files already populated in this environment, but for reference)
#   Ramp/.env             — generation-time credentials (WATSONX_API_KEY, WATSONX_PROJECT_ID,
#                            WATSONX_URL, WATSONX_MODEL_ID)
#   ramp-backend/.env      — runtime service credentials (watsonx grading, Cloudant, Speech-to-Text)
#   These are two SEPARATE credential sets for two separate purposes. Don't conflate them.

# Generate a curriculum from a local path or GitHub URL
node cli/index.js generate ./path/to/repo
node cli/index.js generate https://github.com/owner/repo

# Open the last generated repo (starts ramp-backend on :3001, serves built frontend + API)
node cli/index.js open

# One-shot: generate (if not cached) then open
node cli/index.js https://github.com/owner/repo

# Run the test suite (33 tests: cli/lib/*.test.js, cli/lib/providers/*.test.js, pipeline/lib/*.test.js)
cd cli && npm test

# Frontend dev mode (hot reload, proxies /api -> localhost:3001) — separate from `ramp open`,
# which serves the pre-built ramp-frontend/dist instead. Useful for iterating on frontend code.
cd ramp-frontend && npm run dev    # http://localhost:5173
npm run build                       # production build (ramp open serves this)
npm run lint                        # oxlint — currently passes with pre-existing warnings only
```

**Port note:** `ramp open` and the Vite dev server both talk to the same backend on `:3001`, but
`ramp open` opens `http://localhost:3001` directly (backend serves the built frontend), while
`npm run dev` in `ramp-frontend/` serves the *dev* frontend on `:5173` and proxies `/api` calls to
`:3001`. Don't confuse the two — they show the same data, different frontend build.

**As of this session ending, both are running:**
- `:3001` — backend serving `.ramp/repos/react-redux-realworld-example-app-76e93db067/ramp-manifest.json`
- `:5173` — Vite dev server, same backend

---

## 4. What changed this session (chronological)

Starting point: Codex had already built the watsonx.ai migration (new files below) and it passed
33 tests and one live generation run, but had **not** been tested against a fresh GitHub URL or
walked through in a browser. Picked up from there.

### 4.1 Black-screen bug (Vite proxy stale config)
`ramp-frontend`'s Vite dev server had been started *before* `vite.config.js` was edited to add the
`/api` proxy rule. Vite doesn't hot-reload its own config — the running dev server was silently
falling through to serving `index.html` for `/api/manifest` instead of proxying to the backend.
`ManifestContext`'s fetch then threw a JSON parse error, `Dashboard.jsx` accessed `manifest.repo.name`
on a still-`null` manifest with no guard, React crashed with no error boundary → blank screen.

**Fix (now committed in `547e613`):**
- `ramp-frontend/src/context/ManifestContext.jsx` — added `error` state and a `reload()` function;
  fetch failures no longer silently leave `data: null` with no signal.
- `ramp-frontend/src/pages/Dashboard.jsx` — added an early return rendering `EmptyState` + a Retry
  button when `error` or `!manifest`, instead of crashing.
- Also folded in `ramp-frontend/src/pages/ExplainBack.jsx` — a pre-existing Rules-of-Hooks violation
  (a `useEffect` was called *after* an early `return`, valid one render, invalid the next) that Codex
  had already fixed before this session; confirmed and left as-is.
- **Practical fix in the moment:** just restart the Vite dev server after any `vite.config.js` change.

### 4.2 `ramp open` silently serving stale data (port already in use)
`ramp open` always spawned a *new* backend process on `:3001` without checking whether one was
already running. `ramp-backend/src/server.js`'s `app.listen()` has no error handler, so on
`EADDRINUSE` the new child process crashed immediately — but `cli/lib/open.js` just waited 1.2s and
opened the browser regardless, reporting success while the **old** server (old manifest) kept
answering requests. This is the same failure class as §4.1, just server-side.

**Fix (uncommitted, in `cli/lib/open.js`):**
- Added `ensurePortFree(port)` — uses `lsof -ti tcp:<port>` to find PIDs actually holding the port
  (a `net.createServer()` bind-probe approach was tried first and rejected: it can false-negative on
  macOS due to IPv4/IPv6 dual-stack wildcard-bind semantics — a probe bound to `127.0.0.1` can succeed
  even while another process holds the `::` wildcard on the same port).
- Sends `SIGTERM`, polls up to ~3s, escalates to `SIGKILL` if the process doesn't release the port.
- `startExternalServer` now also listens for the spawned child's `exit` event and rejects with a
  clear error if it dies immediately, instead of silently resolving after the fixed timeout.

### 4.3 Full pipeline test against a second repo (`react-redux-realworld-example-app`)
This is where the real bugs were. Running `node cli/index.js generate <url>` against a repo
structurally different from the original test repo (React/Redux frontend vs. Express/Prisma backend)
failed three times in a row, each time on a different validation:

1. **`data rubric must have 4–6 items`** — the model legitimately produced only 3 rubric items for a
   thinner module. The bound was a hardcoded, not-actually-load-bearing guideline (nothing downstream
   — frontend, `/grade` endpoint — enforces an exact rubric count; the backend only checks
   non-empty). Relaxed `4–6` → `3–6` in **two places** (they're independent checks, both needed
   fixing): `cli/lib/watsonx-pipeline.js` (`validateGeneratedModule`, the per-module retry-feedback
   validator) and `cli/lib/generate.js` (`validateManifest`, the final shared gate used by *both*
   the watsonx and Bob code paths). Also softened the wording in the model prompt.

2. **`auth has no safe local sabotage candidates`** — `pipeline/lib/sabotage-candidates.js` scans a
   module's own `keyFiles` for a small set of recognized "safe mutation" patterns (drop an `await`,
   flip `===`/`!==`, off-by-one, boolean toggle, etc.) to build a deterministic, source-grounded
   sabotage exercise. The `auth` module's files (a thin Redux action/reducer) matched none of them,
   and this **aborted the entire generation run**, not just that module. Fixed in
   `cli/lib/watsonx-pipeline.js`: if a module's own key files yield zero candidates, fall back to
   scanning the *whole* scanned repo before giving up. (Final failure is still a hard error — if truly
   nothing in the repo matches, that's a real signal worth surfacing, not silently skipping.)

3. **Port-reuse bug from §4.2** — hit for real, not just in theory, restarting after these fixes.

All fixed, tests re-run after each change (stayed 33/33 throughout), generation re-run and succeeded:
5 modules, 25→23 quiz questions (varies by run), 5 sabotage cases, 2 diagrams, ~$0.005 per run.

### 4.4 Module summaries were too thin to be useful
User feedback while testing the UI: the "Authentication" module page showed a one-sentence summary
(~78 characters) plus a plain-text file list and a diagram, then a quiz asking specific
implementation-detail questions (e.g. "which middleware protects routes in `auth.ts`?"). There was
no way to answer without already having read the source.

**This turned out to be intentional-by-design, executed poorly, not a missing feature.** The
manifest schema (locked in `Planning_Documents/ramp-feature-map-and-requirements.md`, §5) has no
"lesson content" field — `summary`, `keyFiles`, diagrams, `quiz`, `explainBack`, `sabotage`,
`quests`, nothing else. The intended workflow is: **the developer has the real repo open in their
editor alongside Ramp.** `keyFiles` says where to look, diagrams show structure, `summary` is meant
to be a real orientation (Bob's original prompt in `pipeline/prompts/manifest.md` already specified
"2–4 code-specific sentences" — the watsonx prompt had just dropped that guidance and regressed to
one generic sentence).

**Fix (uncommitted):**
- `cli/lib/watsonx-pipeline.js` `modulePrompt()` — restored explicit "2–4 code-specific sentences,
  orient a developer before they open the key files, name the actual entry point/flow/types" guidance.
- Added an enforced minimum: `module.summary.trim().length >= 120` chars, in **both**
  `validateGeneratedModule` (watsonx-pipeline.js, feeds back into the retry loop so the model gets
  corrected automatically) and `validateManifest` (generate.js, the shared final gate — this means
  Bob-path manifests get the same floor, which is safe since Bob's own prompt already targets 2-4
  sentences).
- Updated two test fixtures (`cli/lib/generate.test.js`, `cli/lib/watsonx-pipeline.test.js`) whose
  placeholder summaries were now too short to pass the new check.
- Regenerated the react-redux manifest to confirm: summaries went from 78 chars / 1 sentence to
  243–406 chars, naming real files (`store.js`, `src/agent.js`, `src/components/App.js`) and actual
  flow. Verified live in the browser.
- **Flagged but not done** (user chose to defer): `KeyFilesList` in `ModuleDetail.jsx` renders file
  paths as inert plain text — no link, no "open this in your editor" affordance. Low-effort UI
  polish if there's time.

---

## 5. Known issues / not yet resolved

Ordered roughly by how much they matter for a working demo:

1. **Cloudant credentials rejected** — `[cloudant] getProgress error — using fallback: Access is
   denied due to invalid credentials.` Backend gracefully falls back to local JSON progress storage
   (not a crash), but progress won't persist to the actual cloud DB, which is one of the judged
   IBM-service integrations. **Not root-caused.** Check `ramp-backend/.env` `CLOUDANT_URL` /
   `CLOUDANT_APIKEY` — likely the same class of problem as the watsonx key rotation earlier this
   session (key deleted/rotated/wrong service instance). This is probably the single highest-value
   thing to fix next.

2. **`docDrift` has returned 0 findings on every live run so far** (both test repos), even though the
   original hand-written fixture manifest had real drift findings. The pipeline is deliberately
   conservative — unrecognized model output shape becomes "zero findings" rather than a loud failure,
   which was a deliberate choice to avoid crashing the whole run over one soft feature, but it means
   **a real drift-detection failure and "this repo genuinely has no drift" currently look identical.**
   Worth adding a way to distinguish "0 found" from "detection degraded" (e.g. log a warning when the
   raw model response didn't parse as expected, even though normalization recovers gracefully).

3. **Sabotage description quality not re-verified on the current repo.** Earlier in this project
   (before this session, on the original `node-express-realworld-example-app` repo), a human review
   found some generated sabotage "symptom" descriptions were technically inaccurate (e.g. claiming a
   dropped `await` would "hang indefinitely" when that's not necessarily true). That review was never
   redone against the sabotage cases generated for `react-redux-realworld-example-app` in this
   session. Worth a quick manual read-through of the 5 sabotage cases before demoing that feature.

4. **Subtask 13 (sealed demo repo) not started.** `cli/lib/prepare-demo.js` exists and works
   (`node cli/index.js prepare-demo <git-url-or-local-repo>`), but no sealed repo has been chosen, no
   `fixtures/demo-manifest.json` exists yet, and no screenshots have been captured. Per `BOB_COMMS.md`
   convention: `bob_sessions/<teamname>_dev1_task<NN>_<description>.png`. If the submission requires
   this artifact, it still needs to be run start to finish.

5. **Nothing from this session is committed except one commit.** See §7 — do this first.

6. Frontend lint (`npm run lint`) passes but with pre-existing warnings (unused imports/vars in
   `Impact.jsx`, `Sidebar.jsx`, `ModuleDetail.jsx`, `Sabotage.jsx`, `useSabotage.js`, missing
   `useEffect` deps in `ModuleDetail.jsx`). None are new from this session; none are blocking.

---

## 6. Architecture map (Dev 1 / Pipeline & CLI track)

```
cli/index.js                    CLI entry — generate / open / prepare-demo / <repo> commands
cli/lib/
  provider-config.js            Resolves RAMP_GENERATION_PROVIDER (watsonx default, bob optional)
                                 + required env vars per provider
  preflight.js                  Pre-flight checks before generation (provider found, env vars set)
  repository-scan.js            Safe file scanner: excludes secrets/binaries/lockfiles/oversized,
                                 redacts inline credential-shaped strings, builds bounded text
                                 context for prompts (discovery / per-module / drift)
  repository-source.js          Resolves a local path vs. GitHub URL; clones to .ramp/repos/<name>-
                                 <hash>/, remembers the last-opened repo in .ramp/last-repository.json
  watsonx-pipeline.js           THE generation pipeline: discovery (route modules to files) ->
                                 per-module generation (summary/quiz/rubric/quests) -> sabotage
                                 candidate selection + scratch-isolated materialization -> diagram
                                 generation -> drift detection -> manifest assembly. All model calls
                                 go through providers/watsonx.js's chatJson() with normalize+validate
                                 callbacks that feed validation errors back to the model as a retry.
  providers/watsonx.js          Low-level watsonx.ai client: IAM token auth, chat completion,
                                 retry-with-feedback loop (chatJson), usage/cost tracking
  generate.js                   Provider-agnostic wrapper used by both watsonx and Bob paths: runs
                                 the provider, then validateManifest() (the FINAL shared validation
                                 gate, independent of whichever provider ran), atomic write with
                                 backup/restore on failure
  open.js                       Starts ramp-backend (or a minimal fallback server if ramp-backend
                                 isn't present), now with port-reclaim logic (see §4.2), opens browser
  prepare-demo.js                Subtask 13 tooling: clone/generate a sealed demo repo, validate,
                                 write fixtures/demo-manifest.json

pipeline/
  lib/deterministic-diff.js     Builds exact unified diffs from verbatim source excerpts (used by
                                 both sabotage injection and doc-correction diffs)
  lib/sabotage-candidates.js    Scans source files for a fixed set of "safe mutation" regex patterns
                                 (dropped await, inverted conditions, off-by-one, boolean toggle,
                                 Prisma relation/query swaps, HTTP status swaps) to build deterministic
                                 sabotage candidates the model then picks from (model never invents
                                 the diff itself — it selects a candidate and writes the symptom text)
  lib/scratch-injection.js      Applies a sabotage/correction diff in an isolated temp copy of the
                                 repo and verifies it, so the real target repo is never touched
  validate-differentiators.js   Post-generation check that every sabotage/correction diff in the
                                 final manifest still applies cleanly in isolation
  prompts/                      Bob Shell's original prompts (kept as genuine build artifacts /
                                 optional fallback provider, per BOB_COMMS.md)

ramp-server/server.js           Shim `ramp open` auto-detects; boots ramp-backend/src/server.js with
                                 RAMP_MANIFEST_PATH / PORT forwarded, loads ramp-backend/.env
```

Full locked schema (don't change without a BOB_COMMS.md entry — Dev 2 and Dev 3 depend on it):
`Planning_Documents/ramp-feature-map-and-requirements.md` §5.

---

## 7. Git state — handle this first

```
Committed through: 547e613 "Finished implementing WatsonX.ai"
  (ManifestContext.jsx, Dashboard.jsx, ExplainBack.jsx — the frontend crash fixes from §4.1)

Still UNCOMMITTED as of this handoff:
  Modified:
    .env.example, .gitignore, BOB_COMMS.md, README.md
    cli/index.js, cli/lib/generate.js, cli/lib/generate.test.js, cli/lib/open.js,
    cli/lib/preflight.js, cli/lib/prepare-demo.js, cli/package.json
    pipeline/lib/scratch-injection.js, pipeline/lib/scratch-injection.test.js
  New (untracked):
    cli/lib/provider-config.js (+.test.js)
    cli/lib/providers/ (watsonx.js, watsonx.test.js)
    cli/lib/repository-scan.js (+.test.js)
    cli/lib/repository-source.js (+.test.js)
    cli/lib/watsonx-pipeline.js (+.test.js)
    pipeline/lib/deterministic-diff.js (+.test.js)
    pipeline/lib/sabotage-candidates.js (+.test.js)
```

This is the entire watsonx.ai migration plus every fix from §4.2–§4.4 — hours of work, all currently
sitting only on disk. **Commit this before doing anything else.** All 33 tests pass on this exact
working tree as of this handoff. Suggested split: one commit for the watsonx provider migration
(everything except open.js/generate.js's post-migration fixes could arguably be one commit, since
Codex's version already had 28 passing tests before this session's fixes), one for the port-reuse +
rubric/sabotage/summary robustness fixes from this session. Or one commit — team's call, just don't
lose it.

Also note: `node-express-realworld-example-app/ramp-manifest.json` (in the **sibling** repo, not
`Ramp/`) is separately modified from an earlier live generation run — unrelated to Ramp's own git
history, that repo has its own `.git`.

---

## 8. Recommended next steps, in order

1. **Commit the uncommitted work in `Ramp/`** (§7). Highest-priority, lowest-risk, do it now.
2. **Fix Cloudant credentials** (§5.1) — likely the highest-value remaining bug; progress persistence
   is a judged feature.
3. **Manual UI walkthrough** of the currently-running app (http://localhost:3001 or :5173): a full
   module quiz, written explain-back, voice explain-back (Speech-to-Text), the sabotage challenge,
   quest board, and confirm progress survives a page reload.
4. **Spot-check sabotage case quality** (§5.3) on the current react-redux manifest — read the 5
   generated symptom descriptions against what the injected diff actually does.
5. **Decide on Subtask 13** (§5.4) — sealed demo repo via `prepare-demo`, `fixtures/demo-manifest.json`,
   screenshots. Needed only if submission judging requires it — confirm before spending time on it.
6. **Add a BOB_COMMS.md entry** summarizing this session for Dev 2 / Dev 3 (a short pointer to this
   file has already been added — expand it if the other tracks need more detail).

---

## 9. Useful facts for a cold start

- Watsonx API key was rotated once already this session (old key was deleted/invalid on IBM's side,
  new key created and confirmed working) — if you see `BXNIM0415E: Provided API key could not be
  found`, that's IAM saying the key itself is gone, not a config/typo problem. Check IBM Cloud →
  Manage → Access (IAM) → API keys.
- Do **not** use these watsonx models (explicitly out of scope per hackathon rules):
  `llama-3-405b-instruct`, `mistral-medium-2505`, `mistral-small-3-1-24b-instruct-2503`. Current
  default is `ibm/granite-4-h-small`.
- A full `generate` run against a small-to-medium repo costs roughly $0.005 in watsonx tokens
  (~13 inference requests, ~50-60k input / ~6-7k output tokens).
- `.ramp/` at repo root is a gitignored cache: cloned GitHub repos (`.ramp/repos/<name>-<hash>/`)
  and `last-repository.json` (what `ramp open` opens with no argument).
