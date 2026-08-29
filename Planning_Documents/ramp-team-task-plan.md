# Ramp — Team Task Plan

**Three developers, parallel tracks, minimal blocking.**
Companion to `ramp-feature-map-and-requirements.md` and `ramp-project-context.md`.

---

## The one idea that makes parallel work possible

**Lock the manifest schema in the first hour, then hand-write a fake manifest.**

`ramp-manifest.json` is the contract between all three tracks. Dev 1 produces it, Dev 2 renders it, Dev 3 grades against it. If everyone waits for Bob to actually generate a real one, two people sit idle for hours.

Instead: agree the schema, have Dev 1 hand-write a realistic fixture manifest with 3 modules, 2 quizzes, a rubric, 3 quests, and 2 drift findings. Dev 2 and Dev 3 build against the fixture from hour two. When Bob's real output arrives, it drops in and everything already works.

**Rule: nobody changes the schema unilaterally after it's locked.** Schema changes are the only thing that can break all three tracks at once. If a change is genuinely needed, it goes through a sync point.

---

## Role assignment

| Dev | Owns | Modules |
|---|---|---|
| **Dev 1 — Pipeline & CLI** | Bob generation, subagents, manifest production, CLI entry point | A, B1, E, G1, K, F2 (generation side) |
| **Dev 2 — Frontend & Experience** | The entire browser application and all six screens | C, and the UI for B, D, F, G, J |
| **Dev 3 — Backend & Integrations** | Thin server, watsonx.ai grading, Cloudant, Speech-to-Text, submission deliverables | H, I, J (service side), submission |

**Dev 1 is excluded from the measurement** — they touch the demo repo. **Dev 2 and Dev 3 are the cold subjects** (Person A and Person B in D15). Neither should clone or read the demo repo at any point.

---

## Phase 0 — Everyone, first hour

Do these together before splitting.

- [ ] **All:** confirm Bob IDE installed, signed in, on the `ibm-coding-challenge-uat` instance (verify: Budget shows 40.00)
- [ ] **All:** confirm IBM Cloud account invite accepted
- [ ] **All:** clone the shared repo, created from IBM's GitHub hackathon template
- [ ] **All:** create `bob_sessions/` folder; agree the naming convention `teamname_devN_taskNN_description.png`
- [ ] **Together:** lock the manifest schema — 20 minutes, whiteboard it, write it down
- [ ] **Dev 1:** hand-write `fixtures/sample-manifest.json` and commit it — **this unblocks Dev 2 and Dev 3**
- [ ] **Together:** agree the four backend endpoint signatures (grade, transcribe, progress read, progress write)

**Only the fixture manifest is a true blocker.** Everything after Phase 0 runs in parallel.

### What is *not* blocking

**Target repository selection is not a Phase 0 task.** It was originally listed here; that was wrong.

- The **manifest schema is repo-agnostic** — modules, quizzes, quests, diagrams, drift findings. Its shape does not depend on which codebase it describes.
- The **fixture manifest can describe a completely fictional application.** Dev 2 renders whatever the JSON contains; the modules do not need to be real.
- **Dev 2 and Dev 3 never touch a target repo at all.** The entire frontend, backend, watsonx grading, and Cloudant layer can be built without one existing.
- **Dev 1 needs a development repo only when ready to test the pipeline** — after Bob Shell install, `/init` setup, and writing the subagent prompts. That is an hour or two of runway.
- **The demo repo is not needed until the final phase**, for measurement and recording only.

**Pick the dev repo informally and quickly.** Any mid-sized multi-module repo with existing documentation works. The subagent prompts are generic, so swapping it later costs almost nothing.

**One mild constraint to remember:** per D14, the dev and demo repos should be similar in shape. Whatever Dev 1 picks now will steer the demo repo choice later — a Python dev repo means you want a Python demo repo. Worth being aware of, not worth delaying for.

**Standing rule from here on: screenshot every Bob task session immediately after it completes.** Not at the end. Access ends Sept 1.

---

## Dev 1 — Pipeline & CLI (Manish Chepuri)

### Track 1A — Bob generation (start here)

- [ ] Install Bob Shell 2.0 (fresh install, no upgrade path from 1.0.x) and verify auth — **do this first, it's a P0 dependency**
- [ ] Pick a **development repo** — mid-sized, multi-module, has documentation. Choose quickly; swapping later is cheap since the prompts are generic
- [ ] Run `/init` on the dev repo to generate baseline AGENTS.md context (A1)
- [ ] Write the repo reconnaissance prompt: purpose, tech stack, entry points, setup steps (A1)
- [ ] Define 3–4 subagents scoped by domain — API, data, frontend, tests (A2)
- [ ] Write the per-subagent prompt producing a structured module record: name, purpose, key files, dependencies, complexity, risk (A2, FR-1.4)
- [ ] Add custom rules enforcing strict JSON output — **do this early, it prevents the most common failure** (FR-1.9)
- [ ] Test the full parallel subagent run on the dev repo; verify output validates against the schema
- [ ] Diagram generation: Mermaid architecture + one sequence diagram (A3)
- [ ] Doc drift detection: ingest README/docs, emit findings with claim, contradiction, location, severity (A4)
- [ ] Starter task mining: TODOs, low-complexity functions, low-blast-radius files, with difficulty ratings (A7)
- [ ] Quiz generation: 3–5 MCQs per module with four options and explanations (B1)
- [ ] Explain-back rubric generation: per-module prompt + key concepts a correct answer must cover (FR-1.11)
- [ ] Package the whole pipeline as a reusable Bob skill (E1)

### Track 1B — CLI

- [ ] `ramp generate <repo>` — invokes Bob Shell non-interactively, writes the manifest (K1, FR-6.1, FR-6.2)
- [ ] `ramp open` — starts the server, opens the browser (K2, FR-6.3)
- [ ] `ramp <repo>` — generate if missing, else open immediately (K3, FR-6.4)
- [ ] Environment config: credentials from env vars or a gitignored env file (K6, FR-6.7)
- [ ] Preflight check: Bob Shell available, credentials present, fail with an actionable message (K7, FR-6.8)
- [ ] Progress streaming: show subagent activity in the terminal (K4) — **this is the demo footage shot, build it properly**
- [ ] Manifest caching by repo + commit (K5, FR-6.6)
- [ ] Failed generation leaves any existing manifest intact (FR-6.9)

### Track 1C — Differentiator generation (after 1A works)

- [ ] Doc correction generation: for a confirmed drift finding, produce corrected text + a diff (F2, FR-1.13)
- [ ] Sabotage case generation: injectable bug per module with location, symptom, and known-correct original (G1, FR-1.14)
- [ ] Verify injection operates only on a scratch copy — **never the real repo** (G6, FR-1.15)

### Track 1D — Demo prep (own this alone)

- [ ] Choose the **demo repo** — similar in language and size to the dev repo, per D14. Not needed until this phase
- [ ] Run full generation against the demo repo — verify valid output only, do not read the code
- [ ] Commit the generated demo manifest as the recording fallback
- [ ] Do not discuss the demo repo's contents with Dev 2 or Dev 3

**Cut first if behind:** Track 1C. Sabotage (G1) is P2; doc correction (F2) is P1 but can be faked with a pre-written correction if generation proves unreliable.

---

## Dev 2 — Frontend & Experience (Gaurinath Subash)

**Builds entirely against `fixtures/sample-manifest.json`. Never blocked on Bob.**

### Track 2A — Core screens (P0)

- [ ] Project scaffold, manifest loading, schema-shaped parsing
- [ ] **Dashboard:** overall progress, XP, level, single next recommended action (C4, FR-2.1)
- [ ] **Module list/detail:** summary, risk level, certification status, available quests (FR-2.2)
- [ ] Inline Mermaid diagram rendering (FR-2.3)
- [ ] **Quiz screen:** one question at a time, scoring, per-answer explanations (FR-2.4)
- [ ] Certification at an 80% threshold (B2, FR-2.5)
- [ ] Quest locking with visible prerequisites (C5, FR-2.6)
- [ ] **Quest board:** quests with XP by difficulty — easy 10, medium 25, hard 50 (C1)
- [ ] XP accumulation and levels: Visitor → Tourist → Resident → Local → Maintainer (C2)

### Track 2B — Differentiator screens (P1)

- [ ] **Explain-back screen:** free-text input, submit, render gap analysis as covered vs missed concepts (FR-2.11)
- [ ] Badge display and award animations (C3, FR-2.7)
- [ ] **Drift findings list:** confirm/dismiss, show Bob's drafted correction in an editable form (F1, F3, FR-2.8, FR-2.12)
- [ ] Contribution ledger display (F4, FR-2.13)
- [ ] **Impact view:** time-to-certification, comprehension score, baseline comparison (D1, D3, D4, FR-2.10)

### Track 2C — Stretch screens (P2)

- [ ] Voice recording UI: mic capture, visible recording state, transcript review before submit (J1, J3, FR-5.1, FR-5.3)
- [ ] Written fallback always available (J6, FR-5.5)
- [ ] Sabotage challenge screen: symptom display, timer, fix submission (G2, FR-2.14)
- [ ] Isolation notice on the sabotage screen (G6, FR-2.16)

### Track 2D — Polish (reserve real time for this)

- [ ] Visual coherence pass across all screens
- [ ] Empty states, loading states, error states
- [ ] Full click-through of every flow before recording day

**Cut first if behind:** Track 2C, then D5/D6 elements of the impact view. **Never cut 2D** — Design and usability is 5 points and this is where they're won.

---

## Dev 3 — Backend & Integrations (Joshua Micheal)

**Also builds against the fixture. Not blocked on Bob or on Dev 2.**

### Track 3A — Server foundation (P0)

- [ ] Thin server: serve static frontend, four endpoints, nothing more (NFR-7)
- [ ] Credentials server-side only, from env vars — **never reaching the browser** (FR-3.6, FR-4.6)
- [ ] IAM token generation from API key, with refresh on 60-minute expiry (FR-3.5)
- [ ] Manifest loading endpoint, reading from file or Cloudant

### Track 3B — watsonx.ai grading (P1, highest priority after 3A)

- [ ] Grading endpoint: accepts explanation + module rubric, returns assessment (H1, FR-3.1)
- [ ] Prompt engineering for strict JSON: `score`, `covered[]`, `missed[]`, `misconceptions[]`, `feedback` (H4, FR-3.2)
- [ ] Response validation with retry on malformed output (H3 handling, FR-3.3)
- [ ] Low-temperature settings for consistency; **test the same answer three times** (H5, FR-3.4)
- [ ] Graceful degradation to MCQ path if watsonx is unavailable (H6, FR-3.7)
- [ ] Confirm the model chosen is not on the out-of-scope list (FR-3.8)

### Track 3C — Cloudant persistence (P1)

- [ ] Manifest storage keyed by repo + commit (I1, FR-4.1)
- [ ] User progress documents: XP, level, certifications, badges, quest state, quiz history (I2, FR-4.2)
- [ ] Session resumption (I3)
- [ ] Local JSON fallback path if Cloudant is unreachable — **demo insurance**
- [ ] Contribution ledger persistence (I4)

### Track 3D — Speech-to-Text (P2)

- [ ] Transcription endpoint accepting audio, returning text (J2, FR-5.2)
- [ ] Route transcript into the identical grading path as written input (J4, FR-5.4)

### Track 3E — Submission deliverables (own these entirely)

- [ ] Verify repo is public and the template's `.gitignore`/`.bobignore` are intact
- [ ] Collect all three devs' `bob_sessions` screenshots; verify naming and completeness
- [ ] Draft the 500-word problem and solution statement
- [ ] Draft the Bob usage statement — **source it from §8 of the requirements doc**, be specific
- [ ] Write the README
- [ ] **Scan the entire repo for credentials before every push**
- [ ] Run a full submission dry run early enough to receive AI Advisor feedback

**Cut first if behind:** Track 3D. **Never cut 3E** — the submission is the deliverable.

---

## Sync points — only four

Keep these short. Everything else happens independently.

**Sync 1 — end of Phase 0.** Schema locked, fixture committed, endpoints agreed. *Everyone blocked until this completes.* Repo selection is not part of this — Dev 1 handles it independently.

**Sync 2 — when Dev 1's first real manifest exists.** Swap the fixture for real output; Dev 2 and Dev 3 confirm nothing breaks. If it does, fix the generator, not the consumers.

**Sync 3 — integration.** Wire the frontend to the real backend endpoints. Budget more time than feels necessary; this is where mismatches surface.

**Sync 4 — scope freeze.** Roughly a third of remaining time left. Stop adding features. Everyone moves to polish, testing, and submission.

---

## Dependency map

```
Phase 0 (all) ──────────────┬──────────────┬──────────────┐
                            │              │              │
                        Dev 1          Dev 2          Dev 3
                     Bob + CLI       Frontend      Backend + subs
                            │              │              │
                            │         (fixture)      (fixture)
                            │              │              │
                     real manifest ────────┴──────────────┤
                            │                             │
                            └────────► Sync 3: integration ◄
                                            │
                                     Sync 4: freeze
                                            │
                              measurement → recording → submit
```

**The only hard dependencies:** Phase 0 blocks everyone. Sync 3 needs both Dev 2 and Dev 3 functional. Everything else runs in parallel.

**Deliberately decoupled:** Dev 2 never waits for Bob. Dev 3 never waits for the frontend. Dev 1 never waits for anyone.

---

## Measurement and recording (final phase)

- [ ] **Dev 1:** confirm demo repo generation works, commit the fallback manifest
- [ ] **Together:** write the five measurement questions about the demo repo — *Dev 1 writes them, since Dev 2 and Dev 3 must stay cold*
- [ ] **Dev 2 or Dev 3 (whoever is Person A):** answer the five questions manually, timed. Record time and correctness.
- [ ] **The other (Person B):** answer the same five using Ramp, timed. **Record this — it is the demo footage.**
- [ ] **One narrator** records voiceover over all screen captures (D16)
- [ ] Exception: the spoken explain-back segment features a second voice
- [ ] Upload publicly (YouTube, Vimeo, or Drive — these get AI Advisor feedback)

---

## If you fall behind — cut in this order

1. Sabotage mode (G) — all of it
2. Speech-to-Text (J) — keep written explain-back
3. Contribution ledger and team-lead view (I4–I6, F4–F5)
4. Impact view metrics (D) — state the numbers in the video instead
5. Doc correction generation (F2) — keep detection, hand-write the correction

**Never cut:** the CLI entry point, the core quiz-and-certification loop, frontend polish, `bob_sessions` screenshots, or the submission deliverables.
