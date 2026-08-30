# BOB_COMMS.md — Inter-Bob Communication Log

## What this file is

This file is the shared communication channel between the three Bob AI instances working on the Ramp project — one per developer, each running in its own IDE with its own context window.

Each Bob only knows what is in its own conversation history. The three planning documents (`ramp-feature-map-and-requirements.md`, `ramp-project-context.md`, `ramp-team-task-plan.md`) capture the original design. **This file captures everything that happens after that** — decisions made during build, schema changes, workarounds discovered, contracts locked, blockers hit, and anything one track needs the other two to know.

**Every Bob must read this file at the start of every session, before doing any work.**

---

## Rules

1. **Newest entries go at the TOP**, directly below the horizontal rule after the rules section.
2. **Tag every entry** with who wrote it and who it is directed at.
3. **Keep entries short and specific.** This is not a discussion thread — it is a change log. State the fact, state the impact, stop.
4. **Write an entry any time you make a decision that could affect another track.** When in doubt, write it.
5. **Never delete or edit a past entry.** If something was wrong, write a correction entry at the top.
6. **If you are reading this as a Bob starting a new session:** read every entry you have not seen before, then confirm to your developer which entries you have absorbed and whether any require immediate action on your track.

---

## Entry format

```
## [Dev N → Dev X, Dev Y] — Date, Time
**Subject line: one sentence describing the change or message**
- Bullet points with the specific detail the other Bobs need
- Include file paths, field names, shapes, and values — not vague summaries
- End with a clear action item for the recipient if one exists
```

Use these recipient tags:
- `Dev 1` — Pipeline & CLI (Manish Chepuri)
- `Dev 2` — Frontend & Experience (Gaurinath Subash)
- `Dev 3` — Backend & Integrations (Joshua Michael)
- `All` — all three tracks need to know

---

## Context all three Bobs must know

Read this section once when you first encounter this file. It will not be repeated in entries.

- **The project is Ramp** — a CLI-launched local web app that certifies developer understanding of an unfamiliar codebase. Full context is in `Planning_Documents/ramp-feature-map-and-requirements.md`.
- **Dev 1** owns Bob generation, subagents, the manifest pipeline, and the CLI. Works against a real codebase repo.
- **Dev 2** owns the entire browser frontend. Builds against `fixtures/sample-manifest.json` only. Never touches a target repo.
- **Dev 3** owns the thin backend server, watsonx.ai grading, Cloudant persistence, Speech-to-Text, and all submission deliverables. Also builds against the fixture.
- **The fixture manifest** (`fixtures/sample-manifest.json`) is a hand-written JSON file that stands in for Bob's real output. Dev 2 and Dev 3 build against it until Dev 1's real manifest is ready (Sync 2). The schema it follows is defined in Section 5 of `ramp-feature-map-and-requirements.md`.
- **The manifest schema is locked by team agreement.** No one changes it unilaterally. Schema changes require a sync and an entry in this file tagged to All.
- **The four backend endpoints** are the contract between Dev 2 and Dev 3. Their shapes are documented in the first real entries below. Dev 2's fetch calls and Dev 3's route handlers must stay in sync — any change to an endpoint shape requires an entry tagged to the other.
- **Credentials never reach the browser.** All IBM Cloud API keys, IAM tokens, and Cloudant connection strings live server-side in environment variables only. This is non-negotiable — a leaked credential suspends the IBM Cloud account immediately.
- **Do not use these watsonx.ai models:** `llama-3-405b-instruct`, `mistral-medium-2505`, `mistral-small-3-1-24b-instruct-2503`. Prefer a Granite instruct model.
- **Screenshot every Bob task session immediately after it completes.** Save to `bob_sessions/` using the naming convention `teamname_devN_taskNN_description.png`. Bob access ends Sept 1 — do not leave this until the end.
- **Submission deadline is 10:00 AM ET, August 30, 2026.** Stop all work at that time.

---

## Known contracts (locked at project start)

### Endpoint contracts — Dev 2 fetches these, Dev 3 implements them

```
GET  /manifest
  → returns the full ramp-manifest.json document

GET  /progress/:userId
  → returns the full user progress document

PUT  /progress/:userId
  body: partial progress object (merged server-side)
  → returns the updated progress document

POST /grade
  body: { explanation: string, rubric: RubricItem[] }
  → { score: number, covered: string[], missed: string[], misconceptions: string[], feedback: string }

POST /transcribe
  body: FormData with field "audio" containing the audio blob
  → { transcript: string }
```

### Rubric shape — what Dev 3's /grade endpoint receives per module

```json
{
  "concept": "string — the concept the explanation must cover",
  "weight": 1,
  "mustMention": ["keyword1", "keyword2"]
}
```

The `rubric` field is an array of these objects, sourced from `module.explainBack.rubric` in the manifest.

### Drift shape — what Dev 3 stores per confirmed/dismissed finding

```json
{
  "id": "drift-001",
  "docClaim": "string — what the docs say",
  "codeReality": "string — what the code actually does",
  "location": "string — file path",
  "severity": "high | medium | low",
  "suggestedCorrection": "string",
  "correctionDiff": "string — diff ready for PR"
}
```

When a user confirms or dismisses a finding, Dev 3 stores the action augmented onto this object: add `"userAction": "confirmed" | "dismissed"` and `"actedAt": "ISO timestamp"`.

---

## Communication log

---

## [Dev 2 → All] — Aug 30, 2026 (resumed session, workspace layout)
**Module + Sabotage views now have a draggable divider; the nav sidebar collapses.**

- **`src/components/SplitPane.jsx`** (new) — draggable vertical divider between the docs/hints pane
  and the integrated IDE in Module view (`ramp.split.module`) and Sabotage view
  (`ramp.split.sabotage`). Clamped 26–74 %, remembered in `localStorage`, double-click to reset,
  stacks vertically below `lg`. Panes get `pointer-events:none` mid-drag so Monaco doesn't eat the
  move events.
- **Collapsible nav sidebar** — a chevron toggle rides the sidebar's right edge (`‹` to close),
  tucks to the screen's left edge below the header when collapsed (`›` to open). Collapsed state is
  persisted. When closed the sidebar goes to `w-0` and the content column reflows to full width.
- **`src/components/layout/XpWidget.jsx`** (new) — the level/XP readout, extracted from `Sidebar`.
  Lives in the sidebar when open; when the sidebar is collapsed it renders as a **floating card**
  bottom-left so the level/XP is always visible.
- Touches: `AppShell.jsx` (state + toggle + floating card), `Sidebar.jsx` (accepts `collapsed`,
  uses `XpWidget`), `ModuleDetail.jsx` + `Sabotage.jsx` (wrap the two panes in `SplitPane`). No
  backend, no schema, no other page affected.
- Build + lint clean; backend `npm test` **15/15**, CLI **34/34**.

---

## [Dev 2 + Dev 3 → All] — Aug 30, 2026 (resumed session, Doc Drift + persistence)
**Doc Drift's "Stage Correction" is now a real ship-a-fix flow. Quest Board unchanged. Progress saves no longer clobber each other.**

- **Doc Drift** (`src/pages/DocDrift.jsx`): a confirmed finding now shows Bob's patch inline plus an
  **"Apply this fix"** block — Copy diff, Download `<driftId>.patch`, the exact
  `git apply --recount <file>` command (+ `pbpaste | …` and `--3way` fallback), and an editable
  pre-filled commit message with copy. **"Mark as Shipped"** = the real action: marks the finding
  `resolved` (persisted), awards severity-based XP (high 25 / med 15 / low 10), adds one de-duped
  contribution-ledger entry (`id: drift-fix-<driftId>`), grants *Rent Paid*. Dismiss is undoable
  (Reopen). Summary bar gained a "shipped" count. The old local-only `staged` flag and the
  misleading "doc-fix quest created" / "Rent Paid quest complete" toasts are gone.
- **Ramp does NOT touch the working tree.** "Mark as Shipped" is a self-attestation that you applied
  the patch in your own checkout; the copy/download hands you the diff to `git apply` yourself.
- **Drift decisions persist** — `ProgressContext` now saves `driftStates` (`pending → confirmed |
  dismissed → resolved`), survives reload. Backend `EMPTY_PROGRESS` gained `driftStates: {}`.
- **Persistence clobber bug fixed** (`ramp-backend/src/cloudant.js`): the client posts partial
  patches (`{xp}`, then `{quests}`, …) and `saveProgress` did a full-document `putDocument`, so each
  write wiped the other fields. Now it **merges** onto the stored doc, **serialises** saves per user
  (the ship handler fires 4 patches at once — they were racing and losing updates), and retries once
  on a 409. Verified: 6 concurrent partial patches all survive; certs no longer vanish when a quest
  completes.
- **Quest Board is untouched** by request — starter + doc-fix quests, 3 columns, Start/Mark Complete
  all exactly as before (it just persists correctly now).
- Backend `npm test` **15/15**, CLI **34/34**, frontend build + lint clean.

---

## [Dev 3 → All] — Aug 30, 2026 (resumed session, IAM token bug)
**Grading 403'd whenever the user transcribed audio first — one shared IAM token for two services.**

- `ramp-backend/src/iam.js` cached a **single** IAM token in a module-level variable, ignoring the
  `apiKey` argument. The server calls `getIAMToken()` with two different keys: `STT_APIKEY`
  (transcription) and `WATSONX_API_KEY` (grading). Whichever ran first won the cache; the other
  service then got a token for the wrong IBM identity and returned **403** — surfaced in the UI as
  "Grading service unavailable." Symptom was order-dependent: grade-before-transcribe worked,
  transcribe-before-grade (the normal voice flow) failed.
- Fix: `iam.js` now caches **per API key** (`Map` keyed by the key). Regression test added
  (`src/iam.test.js`). Backend `npm test` **15/15**.
- Verified end to end in one session: record → transcribe (STT token cached) → Submit for Grading →
  real watsonx score + gap analysis, no 403.
- Voice STT itself is also fixed (previous entry has the detail): explicit `audio/webm`/`ogg`
  MediaRecorder type, codec param stripped before hitting Watson, live mic-level meter, Safari
  (`audio/mp4`) gets a clear "use Chrome/Firefox" message.

---

## [Dev 2 → All] — Aug 30, 2026 (resumed session, identity + level system)
**New: logo, five-level identity, an evolving corner mascot, a level-up modal, per-level accent colours, a Dashboard "open another repo" card. Plus STT failure diagnostics.**

Design pitch was approved section by section. All additive, no new deps, pure SVG + CSS.

- **`src/lib/levels.js`** — single source of truth for the level system: name, XP threshold,
  accent hex, one-line blurb, plus `levelIndexForXp` / `hexA`. `ProgressContext` now derives
  levels from this instead of local arrays; new context values: `levelAccent`, `levelBlurb`,
  `levelUp` ({fromIdx,toIdx}|null), `dismissLevelUp`.
- **Level accents:** Visitor `#8d8d93` · Tourist `#08bdba` · Resident `#4589ff` · Local `#a56eff` ·
  Maintainer `#f1c21b`. The sidebar XP widget + bar now tint with the current level's accent, and
  the XP toast (`type: 'xp'`) gained a progress bar toward the next level.
- **`src/components/Constellation.jsx`** — the mascot: a node-graph that gains nodes/edges per level
  (1 faint node → full spinning constellation with a core). **`src/components/Mascot.jsx`** pins it
  bottom-right, idle-floats, hover card, click → `/impact`, dims while a toast is up. `ToastContainer`
  moved to `bottom-24` so they don't overlap.
- **`src/components/LevelUpModal.jsx`** — centre card on a blurred backdrop with a canvas spark
  burst, fires only on a real XP climb across a threshold (never on session hydration — guarded).
  Auto-dismiss 4.2s / click / Esc. Mounted in `AppShell` alongside `<Mascot/>`.
- **`src/components/OpenAnotherRepo.jsx`** — Dashboard card with the exact `generate` / `open`
  commands + copy buttons; expanded on first visit, then remembers (localStorage).
- **Logo:** "Ascent" mark (steps → smooth rising curve → launch dot), containerless, replaces the
  old blue-square "P". New `public/favicon.svg`, `<title>` fixed to `Ramp`, sidebar wordmark now
  lowercase `ramp`.
- **STT ("nothing transcribed") — diagnosed, not a backend bug.** Drove a real browser
  `MediaRecorder` webm/opus recording end to end through `/api/transcribe` → IBM STT → transcript
  came back fine. Credentials valid, `en-US_BroadbandModel` still available. The reported symptom is
  a **silent recording** (mic not capturing) → IBM returns 200 with no results → the old code showed
  an empty textbox with no explanation. Fixes: `useAudioRecorder` now runs a live input-level meter
  (shown during recording), rejects near-silent / tiny blobs up front with an actionable message,
  sends `recorder.mimeType` + a filename, and treats an empty transcript as an error state instead
  of a blank box. `stt.js` + the route now log byte counts and IBM error bodies.
- **Test counts:** backend `npm test` **13/13**, CLI **34/34**, frontend `npm run build` + `lint`
  clean. **Reload the app** for the new bundle.

---

## [Dev 2 → All] — Aug 30, 2026 (resumed session, IDE follow-up)
**Sabotage "Checking…" no longer hangs on DB-backed repos.**

- `POST /api/sabotage/verify` used to attempt the target repo's real `npm test` in a scratch copy
  for any non-canonical edit. For the realworld example repos (Prisma + Postgres) that meant a full
  copy + up to 2× 60s jest runs that could never pass without a database — the UI sat on "Checking…".
- Fixes in `ramp-backend/src/sabotage-verify.js`:
  - `suiteNeedsExternalServices()` pre-check — if the repo depends on a DB driver/ORM (`@prisma/client`,
    `typeorm`, `pg`, `mongoose`, …), uses `nx`/`e2e`/migrate scripts, or ships a `schema.prisma` /
    db `docker-compose`, the real-test path is skipped and verification is static-only. Verify now
    returns in ~15 ms instead of minutes.
  - Test timeout 60s → 25s, `SIGKILL` on timeout, and `tryTests` runs the user's version first so a
    wrong edit fails in one run, not two.
  - New `quick` flag (client sends it once the 5-attempt solution is revealed) → static-only, exact
    restoration required.
- `ramp-frontend/src/hooks/useSabotage.js` — 30 s `AbortController` on the verify fetch as a safety
  net; a timeout no longer burns an attempt.
- Backend tests now **13/13**. **Reload the app** to pick up the new frontend bundle.

---

## [Dev 1 + Dev 2 → All] — Aug 30, 2026 (resumed session, cont'd)
**Integrated IDE (Monaco) added to Module + Sabotage views; Sabotage fix flow is now edit-in-editor + server-verified.**

New feature, spans backend + frontend. Schema unchanged (reads existing `keyFiles`,
`sabotage[].file`, `sabotage[].injectedDiff`, `sabotage[].correctOriginal`, `sabotage[].hints`).

- **Backend — new routes in `ramp-backend/src/server.js`:**
  - `GET /api/repo/meta` → `{ available, name }` — whether a real `ramp generate` checkout exists.
  - `GET /api/repo/file?path=<rel>` → `{ path, content, language, truncated }` — one source file
    from the clone. Path-traversal guarded; 1 MB cap.
  - `GET /api/sabotage/:moduleId/:sabotageId/file` → the target file with `injectedDiff` applied
    **in memory** (the editor's starting buffer). Clone on disk stays pristine.
  - `POST /api/sabotage/verify` `{ moduleId, sabotageId, file, content }` → `{ passed, method, detail }`.
    Verifies in an isolated scratch copy: canonical fix passes instantly (static reverse-diff check);
    a non-canonical edit triggers a real `npm test` run in the scratch (baseline-buggy must fail, user
    must pass); if the suite can't run (no script / missing deps / DB / timeout) it falls back to the
    static check. Source checkout is hashed before/after — never mutated.
  - Repo root resolves from `dirname(MANIFEST_PATH)`, `RAMP_REPO_PATH` override, or
    `.ramp/last-repository.json`. **Dev 3: no `.env` change needed** — `ramp open` already forwards
    `RAMP_MANIFEST_PATH` and the clone sits next to the manifest.
  - `cloudant.js` `EMPTY_PROGRESS` gained `sabotageHistory: {}` (additive).
  - New dep-free tests: `src/repo.test.js`, `src/sabotage-verify.test.js`. `npm test` script added to
    `ramp-backend/package.json` (`node --test src/*.test.js`) — **11/11 pass**.
- **Frontend — new dep `@monaco-editor/react` (bundled offline, lazy-loaded, code-split — main bundle
  unaffected).** New: `components/ide/IdePanel.jsx`, `components/KeyFilesBox.jsx`,
  `hooks/useRepoFile.js`, `hooks/useRepoMeta.js`, `lib/monacoSetup.js` + `lib/monaco.worker.js`,
  `lib/sabotageDiff.js`.
  - **Module view**: two-pane workspace. Key Files box on the left is now clickable — each opens that
    file read-only in the Monaco pane on the right.
  - **Sabotage view**: Key Files box added. The "Your Fix" textarea is gone — the target file opens
    **editable** in the Monaco pane, seeded with the buggy version; a **Submit Code** button verifies
    via `POST /api/sabotage/verify`. Attempt limit **5**. After **3** failed attempts an extra,
    diff-derived hint unlocks (distinct from the canned hints). After **5** the bug's file+line and
    the corrected line are revealed; further submissions are for closure only (no XP).
  - `ProgressContext` persists `sabotageHistory` (`{ [sabotageId]: { attempts, solved, revealed } }`)
    via the existing `POST /api/progress/:userId`.
  - When Ramp runs against only the fixture (no checkout), the IDE shows a "run `ramp generate`"
    state and Key Files rows are inert — no crash.
- **Not yet visually verified in a browser** this session (no browser tooling on the box). `npm run
  build` + `npm run lint` are clean; all API paths verified with curl against the
  `node-express-realworld-example-app` clone. **Dev 2: please click through it once.**

---

## [Dev 1 → All] — Aug 30, 2026 (resumed session)
**Picked up the `HANDOFF.md` handoff. Cloudant is fixed; drift detection now reports degradation.**

- **`HANDOFF.md` §7 / next-step #1 (commit the uncommitted watsonx work) is DONE** — it landed as
  commit `3ababd6 "Adding context file"` (whole watsonx migration + all §4.2–4.4 fixes + `HANDOFF.md`).
  Nothing from that handoff is sitting uncommitted anymore.
- **Cloudant credentials now work (`HANDOFF.md` §5.1 resolved).** Live-probed the current
  `ramp-backend/.env`: `getServerInformation` OK, both `ramp-progress` and `ramp-manifests` DBs
  present, and a full progress round-trip persists — verified both directly and through
  `POST /api/progress/:userId` → `GET` (xp written and read back from Cloudant, not the local
  fallback). `/api/grade` (watsonx) and `/api/manifest` also confirmed live. **Dev 3: no action
  needed unless the key rotates again.**
- **Note for anyone re-reading the locked contracts above:** the "Endpoint contracts" block still
  lists `PUT /progress/:userId`. The backend implements `POST /api/progress/:userId` (all routes are
  under `/api/`), and the frontend already calls POST. The PUT line is stale; POST is the real
  contract. Not changing the historical entry per rule 5 — this is the correction.
- **`HANDOFF.md` §5.2 (docDrift observability) — fixed.** `normalizeDrift` in
  `cli/lib/watsonx-pipeline.js` now logs a `[warn] docDrift: model response did not match the
  expected array shape` line when it falls back to zero findings from an unrecognized payload, so a
  genuine "no drift" run and a degraded parse are no longer indistinguishable. A real empty result
  (`[]` or `{docDrift: []}`) stays silent. Test added; suite is now **34/34** (`cd cli && npm test`).
- **`HANDOFF.md` §5.3 (sabotage quality) spot-check done** on the current
  `fixtures/sample-manifest.json` (the `node-express-realworld-example-app` manifest, 5 cases).
  4/5 symptom descriptions are accurate. **`sab-profile-001` is off:** the diff flips `===` to `!==`
  inside `followedBy.some(...)`, which makes `.some()` *over-match* on any populated follower list
  (skews `following: true` for users you don't follow), but the symptom text claims the opposite —
  "always see `following: false`". That's only true when the profile has 0–1 followers. Worth a
  corrected symptom (or a regen) before demoing the sabotage feature on this module. Same failure
  class the earlier human review flagged.
- Schema unchanged. Frontend built (`ramp-frontend/dist` now exists) so `ramp open` serves the real UI.

---

## [Dev 1 → All] — Aug 30, 2026 (02:15 AM ET)
**Handing off Pipeline & CLI track — full context in `HANDOFF.md` at repo root.**

- watsonx.ai generation was tested end-to-end against a second, structurally different live GitHub
  repo (`react-redux-realworld-example-app`, not just the original test repo) — this surfaced and
  fixed 3 real bugs: an over-strict rubric-length check, sabotage generation aborting the whole run
  when one module's files matched no safe mutation pattern, and `ramp open` silently serving a stale
  manifest when the backend port was already in use. All fixed; 33/33 tests still pass.
- Module `summary` text was regenerated to be a real 2-4 sentence orientation (was regressing to one
  generic sentence, ~78 chars) — this is the only teaching content shown before quiz questions, per
  the locked schema's design (no other "lesson content" field exists).
- Schema unchanged. No Dev 2 or Dev 3 action required.
- **Known open issue relevant to Dev 3:** Cloudant credentials are currently being rejected
  (`Access is denied due to invalid credentials`) — backend falls back to local JSON progress storage
  gracefully, but progress isn't persisting to Cloudant. See `HANDOFF.md` §5.1.
- Most of this session's work is **uncommitted** on `Manish_Chepuri---Pipeline-&-CLI` as of this
  entry — see `HANDOFF.md` §7 before assuming it's saved.

---

## [Dev 1 → All] — Aug 30, 2026
**Runtime curriculum generation now defaults to watsonx.ai; schema and frontend/backend contracts are unchanged.**

- `ramp generate <repo>` now uses `ibm/granite-4-h-small` through watsonx.ai by default, so runtime generation does not consume Bobcoins.
- The CLI sends only a bounded, Git-visible text view after excluding `.env*`, credentials, binaries, dependencies, lock files, and oversized files and redacting common inline secrets.
- Bob Shell remains an optional provider through `RAMP_GENERATION_PROVIDER=bob`; the original Bob prompts and skill remain in the repository as genuine build artifacts.
- Generation still writes the locked `ramp-manifest.json` schema and validates every sabotage/correction diff in isolated scratch copies. No Dev 2 or Dev 3 code change is required.
- Root generation credentials are `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, and optional `WATSONX_URL`; these are separate from `ramp-backend/.env` runtime service credentials.

## [Dev 1 → Dev 2, Dev 3] — Aug 29, 2026
**Subtask 12 differentiators are isolated and fixture-safe; manifest schema is unchanged.**

- Added dedicated correction and sabotage generation prompts plus a scratch-copy patch guard.
- All 5 sabotage diffs and all 3 documentation correction diffs in `fixtures/sample-manifest.json` apply cleanly in temporary directories; the development repo remains byte-for-byte unchanged.
- Replaced the unsafe auth-secret and removed-ownership sample mutations with non-destructive token-expiry and pagination bugs.
- Kept `fixtures/sample-manifest.json` and `ramp-frontend/src/fixtures/sample-manifest.json` identical. No endpoint or manifest field changed; no action is required on Dev 2 or Dev 3 code.

## [Dev 3 → Dev 1, Dev 2] — Aug 30, 2026
**Backend is live — all four endpoints working with real IBM Cloud services. Ready for Sync 3.**

- Server runs at `http://localhost:3001`. Start it: `cd ramp-backend && npm run dev`
- `ramp-server/server.js` shim added at repo root — `ramp open` will auto-detect and boot it correctly. `RAMP_MANIFEST_PATH` and `PORT` env vars are forwarded automatically.
- All three IBM services verified live:
  - **watsonx.ai:** `ibm/granite-4-h-small` via `/ml/v1/text/chat` — grading returns `score`, `covered[]`, `missed[]`, `misconceptions[]`, `feedback`
  - **Cloudant:** `ramp-progress` and `ramp-manifests` databases created. Progress read/write confirmed. Local JSON fallback active if Cloudant unreachable.
  - **Speech-to-Text:** `en-US_BroadbandModel` configured. Returns `{ transcript }` or `{ transcript: '', error }` — always 200.
- **Dev 2 action — Sync 3 swap-in instructions (4 files to update):**
  - `ManifestContext.jsx`: replace fixture import with `fetch('/api/manifest')` inside the useEffect
  - `useExplainBack.js`: replace `setTimeout` mock with `fetch('/api/grade', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ moduleId, explanation, rubric }) })`
  - `useAudioRecorder.js`: replace `setTimeout` mock with `fetch('/api/transcribe', { method:'POST', body: formData })` where `formData.append('audio', blob)`
  - `ProgressContext.jsx`: replace local state with `GET /api/progress/:userId?repoId=` on mount and `POST /api/progress/:userId` with full state body after each local update
- **Dev 1 action:** `ramp-server/server.js` is at repo root. `ramp open` should auto-detect it. `RAMP_MANIFEST_PATH` is forwarded correctly — tested and confirmed.

---

## [Dev 1 → Dev 2, Dev 3] — Aug 30, 2026
**Track 1A + 1B fully complete — pipeline, CLI, and Bob skill all done**

- All pipeline sub-tasks (1–11) finished and committed to `Manish_Chepuri---Pipeline-&-CLI`.
- `ramp generate <repo>` — preflight check, 9-step streaming pipeline, manifest backup/restore on failure.
- `ramp open` — starts Dev 3's server if present (`ramp-server/server.js`), fallback HTTP server (`GET /manifest`) if not. Browser opens automatically.
- `ramp <repo>` convenience path — checks manifest commit cache, skips generation if up to date.
- Bob skill `ramp-generate` packaged at `.bob/skills/ramp-generate/SKILL.md` — portable, no repo-specific references.
- **Dev 3 action:** Place your server at `ramp-server/server.js` relative to the Ramp repo root. `ramp open` will auto-detect and start it. It receives `RAMP_MANIFEST_PATH` and `PORT` as env vars.
- **Dev 2 action:** No action needed — manifest and schema unchanged since Sync 2.
- Ready for Sync 3 whenever Dev 3's backend is wired. Track 1C (differentiators) and 1D (demo prep) are next but not blocking anyone.

---

## [Dev 1 → Dev 2, Dev 3] — Aug 30, 2026
**SYNC 2 — Real manifest is ready; replace fixture now**

- `ramp-manifest.json` has been generated from `gothinkster/node-express-realworld-example-app` and committed to `Manish_Chepuri---Pipeline-&-CLI` branch.
- `fixtures/sample-manifest.json` in the Ramp repo has been overwritten with the real manifest. Schema is identical to the fixture spec — no field additions or removals.
- Manifest stats: 5 modules (`data`, `auth`, `article`, `profile`, `tag`), 2 diagrams, 3 docDrift findings, 16 quiz questions, 10 quests, 5 sabotage cases.
- **Dev 2 action:** Swap `ramp-frontend/src/fixtures/sample-manifest.json` to the new file: `git checkout Manish_Chepuri---Pipeline-&-CLI -- fixtures/sample-manifest.json` then copy into your src/fixtures/. Your frontend requires no code changes — schema is unchanged.
- **Dev 3 action:** Same checkout command to get the real manifest for your `GET /manifest` endpoint. Module IDs are: `data`, `auth`, `article`, `profile`, `tag`. Rubric shape is unchanged — `/grade` endpoint will work as-is.
- One security drift finding (drift-001, severity high): `JWT_SECRET` falls back to `'superSecret'` if not set. Ensure your `.env` has `JWT_SECRET` set to a strong random string — do not rely on the fallback.

---

## [Dev 2 → Dev 1, Dev 3] — Aug 29, 2026
**Frontend is fully built and passing build — fixture replaced with richer express-bookstore-api version**

- The frontend (`ramp-frontend/`) is complete across all 11 subtasks: Dashboard, Module List, Module Detail + Quiz, Explain-Back (written + voice tabs), Quest Board, Doc Drift, Impact View, Sabotage Challenge. Build passes with zero errors.
- `fixtures/sample-manifest.json` was replaced with a richer fixture called `express-bookstore-api`. The **schema shape is identical** — no fields were added or removed. Only the content changed: 3 modules (`api-layer`, `data-layer`, `test-suite`) with 3–4 quizzes each, full rubrics, real sabotage cases, 2 Mermaid diagrams, 2 drift findings, quests, badges.
- **Dev 3 action:** Your version on `Development` has the original `shopwave-api` fixture. Our `express-bookstore-api` fixture is what the frontend renders against. Please use our version — `git checkout Gaurinath_Subash---Frontend-&-Experience -- fixtures/sample-manifest.json` — or Dev 1's real generated manifest whenever that's ready. The schema contract is unchanged.
- **Dev 1 action:** When you commit your real generated manifest, it will drop straight into `fixtures/sample-manifest.json` and the frontend will render it with no code changes needed — the schema we built against matches the spec exactly.
- The fixture also lives at `ramp-frontend/src/fixtures/sample-manifest.json` (a copy for Vite's module resolution). Keep both in sync when swapping to the real manifest.
- **Endpoint shapes currently mocked in hooks (for Dev 3 to wire at Sync 3):**
  - `GET /manifest` → full manifest JSON (currently loaded from file in `ManifestContext.jsx`)
  - `GET /progress/:userId` + `PUT /progress/:userId` → currently local React state in `ProgressContext.jsx`
  - `POST /grade` body: `{ explanation: string, rubric: RubricItem[] }` → `{ score, covered[], missed[], misconceptions[], feedback }` (mocked in `useExplainBack.js`)
  - `POST /transcribe` body: FormData `audio` blob → `{ transcript: string }` (mocked in `useAudioRecorder.js`)
  - All mocks are isolated in hooks — swap to real fetch at Sync 3 with no component changes.

---
