# Ramp — Feature Map & Functional Requirements

**IBM TechXchange 2026 Pre-conference Dev Day Hackathon**
Theme: Build with purpose using IBM Bob 2.0
Workflow targeted: Developer onboarding to unfamiliar codebases

---

## 1. Product Summary

**One-liner:** Ramp certifies that a developer actually understands an unfamiliar codebase — and makes the codebase better while they learn it. Generated end-to-end by IBM Bob, re-runnable against any repository.

**The problem:** A developer joining an unfamiliar codebase spends days reconstructing knowledge that already exists in the code, commit history, and stale docs. Existing solutions are static READMEs that rot, or tribal knowledge locked in a senior dev's head. Nobody can tell whether the new dev *actually* understood anything until they break something in week three. And onboarding is treated as pure cost — the org pays for weeks of ramp-up and gets nothing back until it ends.

**The three insights that differentiate Ramp:**

1. **Verification, not explanation.** Most AI-onboarding tools explain code faster. Ramp verifies comprehension and certifies readiness — turning onboarding from a reading exercise into a measurable, auditable progression with a defensible completion signal.
2. **Onboarding that pays rent.** The new dev's first quests fix the stale documentation Bob found. The person who knows least about the codebase becomes the one improving it on day one, so onboarding produces value instead of only consuming it.
3. **You learn a codebase by debugging it, not reading it.** Ramp's certification includes hunting a real bug Bob deliberately planted — the way senior developers actually learned every codebase they know.

**Target users:**
- **Primary:** A developer joining a new codebase (new hire, internal transfer, open-source contributor, contractor)
- **Secondary:** The team lead / onboarding buddy who currently loses hours to hand-holding and wants visibility into ramp-up progress

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  STAGE 1 — GENERATION (IBM Bob)            BUILD TIME   │
│  Bob IDE Agent mode + subagents run in parallel across  │
│  the target repo and emit structured JSON artifacts     │
│  Authors: summaries · diagrams · quizzes · rubrics ·    │
│  quests · drift findings · sabotage cases               │
└───────────────────────────┬─────────────────────────────┘
                            │  ramp-manifest.json
                            ▼
┌─────────────────────────────────────────────────────────┐
│  STAGE 2 — ARTIFACT LAYER                               │
│  Versioned JSON: modules, diagrams, quizzes, quests,    │
│  doc-drift findings, glossary, risk map, rubrics        │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌─────────────────┐  ┌────────────────┐
│ STAGE 3       │  │ STAGE 4         │  │ STAGE 5        │
│ EXPERIENCE    │  │ RUNTIME         │  │ PERSISTENCE    │
│ Ramp web app  │◄─┤ INTELLIGENCE    │  │ IBM Cloudant   │
│               │  │ watsonx.ai      │  │                │
│ Quest board · │  │ (Granite)       │  │ Progress · XP ·│
│ quizzes ·     │  │ + Speech-to-Text│  │ certifications │
│ progress ·    │  │                 │  │ · ledger ·     │
│ certification │  │ Grades explain- │  │ manifests      │
│ · metrics     │  │ backs, spoken   │  │                │
│               │  │ or written      │  │                │
└───────────────┘  └─────────────────┘  └────────────────┘
                          RUNTIME
```

**Key architectural decision #1:** Bob's output is a *structured, versioned artifact*, not prose. This is what makes Ramp a re-runnable product rather than a one-off document — point it at a new repo, re-run the Bob pipeline, get a fresh curriculum with zero front-end changes.

**Key architectural decision #2 — the build-time / runtime split:** Bob is a build-time tool; a deployed application cannot call it. But explain-back grading requires inference *at the moment the developer submits an answer*. watsonx.ai fills exactly this gap. The division of labor is clean and deliberate:

> **Bob authors the curriculum. watsonx.ai grades against it. Cloudant remembers.**

Each IBM product occupies a distinct architectural layer with no overlap — this is a designed stack, not an accumulation of products bolted on to satisfy a checklist.

### 2.1 Form Factor & Delivery Model

**Ramp is a locally-run CLI-launched web application.** Not an IDE, not a Bob IDE extension, not a hosted SaaS product.

The developer runs a command in their terminal, from inside the project directory they are trying to learn. Ramp generates the curriculum, starts a local server, and opens the browser automatically.

```
ramp generate ./path/to/repo     invokes Bob to build the curriculum
ramp open                        serves the app and opens the browser
ramp ./path/to/repo              convenience: generate if missing, then open
```

**Why a CLI entry point.** Developers already expect this shape from `jupyter notebook`, `storybook`, and `vite` — a tool that installs, runs from the terminal, and pops a browser reads as a developer tool rather than a SaaS product. It also places Ramp inside the developer's existing workflow rather than adjacent to it: you are already in your terminal, in the repository, and one command starts the process. This directly serves the Design and usability criterion's "how quickly and easily could it be put to use."

**Why generation and serving are separate commands (NFR-6).** Generation runs parallel subagents across an entire codebase and takes minutes. Serving is instant. Collapsing them into one command would mean waiting through generation every launch — unacceptable for repeat use, and fatal in a 90-second demo. Separating them means a repository whose curriculum already exists opens immediately.

**Why not a Bob IDE extension.** It is the intuitive choice, and it is wrong here for three reasons: extension scaffolding and webview lifecycle would consume a large share of the build budget for no judging benefit; microphone access for spoken explain-back (Module J) is materially harder inside a webview than in a browser tab; and a full-screen browser app produces far better demo footage than a cramped IDE side panel.

**Answering the obvious objection.** "The developer has to leave their IDE." Ramp is deliberately a pre-coding activity — you complete the curriculum, earn certification, and *then* open the editor. Quests hand you a file path, which is the handoff point. The terminal entry point keeps the whole flow inside the developer's normal environment.

### 2.2 Runtime Components

| Component | Responsibility |
|---|---|
| `ramp` CLI | Entry point; orchestrates generation, starts server, opens browser |
| Generation driver | Invokes Bob Shell non-interactively against the target repo; writes the manifest |
| Thin backend server | Serves the front end; proxies watsonx.ai and Cloudant; holds all credentials |
| Browser front end | The full Ramp experience: dashboard, modules, quizzes, explain-back, quests, metrics |

**Keep the backend genuinely thin.** It is a credential proxy and a static file server, not an application. Roughly four endpoints: serve the app, grade an explanation, transcribe audio, read/write progress. All curriculum logic lives in Bob's manifest and all interaction logic lives in the browser. If business logic starts accumulating server-side, the design has drifted.

### 2.3 Bob Shell as a Runtime Component

Bob Shell supports non-interactive sessions — scriptable and invokable from the command line for automation and batch processing. Ramp's generation driver uses this to call Bob directly.

**Why this matters strategically.** It changes what Ramp *is*. Rather than "we used Bob in the IDE and saved its output," Ramp becomes a product that *invokes Bob's agent pipeline as part of its own operation*. This makes the re-runnability claim (E1–E2) literally true rather than aspirational, and it is a materially stronger answer to the hackathon's requirement that Bob be a core component of the solution.

**Two constraints to respect:**
- Bob Shell is optional for the hackathon; **Bob IDE is required**. Using Shell inside Ramp does not substitute for IDE usage — task session summary screenshots must still come from IDE work, which happens naturally while building Ramp itself. Shell is additive.
- Bob Shell 2.0 requires a **fresh install** with no automated upgrade path from 1.0.x. Install it early; do not discover this at hour 30.

---

## 3. Feature Map

### Module A — Codebase Intelligence (Bob-generated)

| ID | Feature | Description |
|----|---------|-------------|
| A1 | Repo reconnaissance | Bob's Agent mode explores the repo unassisted: purpose, tech stack, entry points, build/run instructions |
| A2 | Parallel module analysis | 3–5 subagents each own a domain (API, data, frontend, tests, infra) and analyze concurrently in isolated contexts |
| A3 | Architecture diagrams | Auto-generated Mermaid diagrams: component map, key sequence flows, data model |
| A4 | Doc drift detection | Bob compares existing README/docs against actual code and flags contradictions, stale instructions, and undocumented behavior |
| A5 | Concept glossary | Extracts domain/project-specific jargon and defines each term in context of this codebase |
| A6 | Danger zone map | Flags high-risk files: high churn, high complexity, low test coverage, many dependents — "don't touch these on day one" |
| A7 | Starter task mining | Mines TODOs, low-complexity functions, and low-blast-radius files into ranked candidate first tasks with difficulty ratings |

### Module B — Comprehension & Certification

| ID | Feature | Description |
|----|---------|-------------|
| B1 | Auto-generated module quizzes | Bob generates 3–5 questions per module from its own analysis, with explanations for each answer |
| B2 | Module certification | Passing a module's quiz certifies the dev on that module and unlocks its quests |
| B3 | Answer explanations | Every quiz answer includes *why*, so a wrong answer teaches instead of just scoring |
| B4 | Retry with variation | Failed quizzes can be retaken; Bob pre-generates an alternate question bank so retries aren't memorization |
| B5 | Certification record | Per-user record of which modules they're certified on, exportable as onboarding evidence for the team lead |
| B6 | Explain-back challenge | Dev writes a free-text explanation of a module in their own words; Bob grades it against its own analysis |
| B7 | Gap analysis feedback | Bob returns specific misconceptions and omissions ("you described the request flow correctly but missed that auth is middleware, not per-route") rather than a bare score |
| B8 | Explain-back scoring | Free-text explanation scored on coverage of key concepts, feeding the same certification threshold as quizzes |

### Module C — Gamified Progression

| ID | Feature | Description |
|----|---------|-------------|
| C1 | Quest board | Bob's starter tasks rendered as quests with XP values mapped from difficulty (easy 10 / medium 25 / hard 50) |
| C2 | XP & levels | Cumulative XP with named levels (e.g. Visitor → Tourist → Resident → Local → Maintainer) |
| C3 | Badges | Milestone achievements: *First Light* (ran setup successfully), *Cartographer* (viewed all diagrams), *Doc Detective* (confirmed a doc-drift finding), *Bug Hunter* (solved a sabotage challenge), *In Your Own Words* (passed an explain-back), *Rent Paid* (shipped a doc correction), *Certified* (passed all module quizzes), *First Blood* (first commit) |
| C4 | Progress dashboard | Overall ramp-up percentage, per-module completion, next recommended action |
| C5 | Unlock progression | Modules gate in a sensible order — you can't quest in the data layer before certifying on the architecture overview |
| C6 | Streak / session tracking | Lightweight engagement tracking across onboarding sessions |

### Module D — Impact Measurement (the judging differentiator)

| ID | Feature | Description |
|----|---------|-------------|
| D1 | Time-to-first-understanding | Timestamps from repo open → first module certification |
| D2 | Time-to-first-commit | Tracked from onboarding start to first merged quest |
| D3 | Baseline comparison | Displays measured ramp time against a manual-onboarding baseline for a clear before/after |
| D4 | Comprehension score | Aggregate quiz performance as a proxy for actual understanding, not just time spent |
| D5 | Team lead view | Read-only dashboard showing where each onboarding dev is, and which modules people consistently fail (signals bad docs or genuinely confusing code) |
| D6 | Doc-health score | % of documentation Bob found consistent with code — gives the team a maintenance signal that improves over time |

### Module E — Re-runnability & Portability

| ID | Feature | Description |
|----|---------|-------------|
| E1 | Bob skill packaging | The entire generation pipeline packaged as a reusable Bob skill so it runs identically on any repo |
| E2 | One-command regeneration | Point Ramp at a new repo path → full curriculum regenerates without touching the front end |
| E3 | Manifest versioning | Curriculum artifacts are versioned; re-running on an evolved codebase produces a diff of what changed |
| E4 | Curriculum refresh | Re-run detects code changes since last generation and flags which modules/quizzes are now stale |

### Module F — Contribution Loop ("onboarding pays rent")

| ID | Feature | Description |
|----|---------|-------------|
| F1 | Drift-to-quest conversion | Every doc-drift finding from A4 becomes a real, assignable first quest with XP |
| F2 | Auto-drafted correction | When a dev confirms a drift finding, Bob generates the corrected documentation text and a ready-to-open PR/diff |
| F3 | Human-in-the-loop review | Dev reviews and edits Bob's correction before it's staged — they learn by verifying, and nothing lands unreviewed |
| F4 | Contribution ledger | Running tally of real improvements the onboarding dev shipped: docs fixed, drift resolved, TODOs closed |
| F5 | Value-returned metric | Surfaces "this onboarding produced N documentation fixes" as an org-level outcome, not just a personal score |

### Module G — Sabotage Mode

| ID | Feature | Description |
|----|---------|-------------|
| G1 | Bug injection | Bob generates a realistic, module-appropriate bug (off-by-one, wrong operator, inverted condition, dropped await) against a scratch copy of the module |
| G2 | Bug hunt challenge | Dev is told only the observable symptom and must locate the defect; a timer runs |
| G3 | Progressive hints | Tiered hints (narrow to file → narrow to function → reveal) at escalating XP cost, so the dev is never truly stuck |
| G4 | Fix verification | Dev's proposed fix is checked against the known-correct original; passing awards the *Bug Hunter* badge |
| G5 | Difficulty scaling | Bug complexity scales with the dev's current level, so late-stage sabotage is genuinely hard |
| G6 | Safety isolation | Injection operates on an isolated working copy or scratch branch — the real repository is never modified |

### Module H — Runtime Intelligence (IBM watsonx.ai)

**Why this module exists:** Bob runs in the IDE at build time and cannot be called by the deployed application. Explain-back grading (B6–B8) requires inference at the moment a developer submits an answer. watsonx.ai closes this gap and is what makes Ramp a live product rather than a static generated artifact.

| ID | Feature | Description |
|----|---------|-------------|
| H1 | Rubric-grounded grading | A Granite model receives the dev's explanation plus Bob's pre-authored module rubric and returns a structured assessment |
| H2 | Coverage scoring | Returns a numeric score reflecting how many rubric concepts the explanation actually covered |
| H3 | Misconception detection | Identifies not just omissions but active errors — statements contradicting the rubric — and names them specifically |
| H4 | Structured output contract | Model is prompted to return strict JSON (`score`, `covered[]`, `missed[]`, `misconceptions[]`, `feedback`) so the front end parses deterministically |
| H5 | Deterministic settings | Low temperature and constrained output to keep grading consistent across attempts — the same answer should score the same twice |
| H6 | Graceful degradation | If the watsonx.ai call fails or times out, the app falls back to the multiple-choice quiz path so certification is never blocked |

**Implementation notes.** Uses the watsonx.ai text/chat inference API with an IAM access token generated from an API key (tokens expire after 60 minutes; refresh accordingly). Model selection should favor a Granite instruct model — smaller models are both cheaper and adequate for rubric-matching, and the guide explicitly notes bigger is not always better. Do not use the models listed as out of scope for the hackathon. Grading is a small-payload operation, so cost is negligible at 1,000 tokens = 1 RU = $0.0001; avoid Jupyter notebook runtimes, which bill at $1.02 per capacity unit hour and are the real credit risk.

### Module I — Persistence & Team Layer (IBM Cloudant)

**Why this module exists:** FR-2.9 requires progress to survive across sessions and D5 requires multi-user visibility. Cloudant is a JSON document store, so Ramp's manifest and progress objects persist without any schema translation — the same shape Bob emits is the shape that gets stored.

| ID | Feature | Description |
|----|---------|-------------|
| I1 | Manifest storage | Generated curricula stored as documents, keyed by repo and commit, so multiple codebases coexist in one Ramp instance |
| I2 | User progress documents | Per-user record of XP, level, certifications, badges, quest completion, and quiz history |
| I3 | Session resumption | A dev closing the app and returning later resumes exactly where they left off |
| I4 | Contribution ledger persistence | Durable record of doc fixes and improvements shipped during onboarding (feeds F4/F5) |
| I5 | Team-lead aggregate view | Read-only roll-up across all onboarding devs: who is where, average time-to-certification, and which modules people repeatedly fail |
| I6 | Weak-module signal | Modules with consistently low first-attempt pass rates are surfaced to the team as a documentation or code-clarity problem |
| I7 | Multi-repo support | One Ramp deployment serves many codebases, which is the core of the scalability story |

**Why I5 and I6 matter for judging.** They convert Ramp from a single-user utility into team infrastructure. A module that every new hire fails is not a people problem — it is a signal that the code or its documentation is genuinely unclear. That insight is only possible once progress is persisted across users, and it directly supports the "potential to scale to more users or use cases" language in the Effectiveness criterion.

### Module J — Spoken Explain-Back (IBM Speech-to-Text)

**Why this module exists:** The Feynman technique is verbal. Explaining a system out loud is how comprehension is actually tested in the real world — in architecture reviews, in design discussions, in every technical interview a developer has ever sat. Typing into a textarea is a weaker proxy. Module J makes Ramp's certification step a spoken walkthrough of the codebase.

| ID | Feature | Description |
|----|---------|-------------|
| J1 | Voice capture | Browser microphone capture of the dev explaining a module aloud, with clear start/stop and visible recording state |
| J2 | Speech-to-Text transcription | Audio transcribed via IBM Speech-to-Text and returned as text |
| J3 | Transcript review | Dev sees the transcript before submission and may correct transcription errors, so grading never penalizes a misheard word |
| J4 | Pipeline reuse | Transcript feeds the identical Module H grading path — spoken and written explain-backs share one grading contract |
| J5 | Interview-mode framing | Presented as a codebase architecture interview: a prompt, a timer, an unscripted verbal answer, then structured feedback |
| J6 | Written fallback | Text entry remains fully available for accessibility, noisy environments, and demo reliability |

**Why this is the strongest creative feature in the spec.** No other submission is likely to have a developer *talk to their onboarding tool and be graded on what they said*. It reframes Ramp as a whiteboard interview simulator for the codebase you are joining. It also films better than anything else here — a person speaking to their screen and receiving structured feedback is materially more compelling footage than a form submission, and the demo video is where Creativity and Design points are won or lost.

### Module K — CLI & Generation Driver

**Why this module exists:** Ramp's entry point is the terminal, and its generation step invokes Bob Shell programmatically. This module is what makes Ramp a portable developer tool rather than an application someone has to deploy.

| ID | Feature | Description |
|----|---------|-------------|
| K1 | `ramp generate <repo>` | Invokes Bob Shell non-interactively against the target repository and writes `ramp-manifest.json` |
| K2 | `ramp open` | Starts the local server and opens the default browser to the Ramp dashboard |
| K3 | `ramp <repo>` convenience path | Checks for an existing manifest; opens immediately if present, generates first if not |
| K4 | Generation progress output | Streams Bob's subagent activity to the terminal so the user sees the pipeline working, not a frozen prompt |
| K5 | Manifest detection & caching | Recognizes an existing manifest for a repo and commit, avoiding needless regeneration |
| K6 | Environment configuration | Reads credentials from environment variables or a gitignored local env file; never from committed code |
| K7 | Preflight check | Verifies Bob Shell availability and required credentials before starting, failing with a clear message rather than mid-run |

**Demo note.** K4 is worth building carefully. Streaming Bob's subagents spinning up gives you a few seconds of terminal footage that visibly proves Bob is doing the work — the cleanest possible evidence for the "clearly demonstrate how you utilized IBM Bob" requirement. Show generation starting, then cut to `ramp open` and the finished interface; you get the credibility without dead air on camera.

---

## 4. Functional Requirements

### 4.1 Generation Pipeline (Bob)

- **FR-1.1** The system shall accept a target repository path as input and require no other manual configuration.
- **FR-1.2** Bob shall operate in Agent mode to autonomously explore the repository without step-by-step human prompting.
- **FR-1.3** The system shall dispatch a minimum of three subagents operating in parallel, each scoped to a distinct codebase domain in an isolated context.
- **FR-1.4** Each subagent shall emit a structured module record containing: name, purpose, key files, entry points, dependencies, complexity rating, and risk rating.
- **FR-1.5** Bob shall ingest existing repository documentation (README, docs/, comments) using document understanding and produce a list of drift findings, each with: claim in docs, contradicting code location, and severity.
- **FR-1.6** Bob shall generate at least one Mermaid architecture diagram and one sequence diagram per major flow.
- **FR-1.7** Bob shall generate 3–5 multiple-choice quiz questions per module, each with four options, one correct answer, and a written explanation.
- **FR-1.8** Bob shall produce a ranked list of candidate starter tasks, each with a difficulty rating, affected files, and a rationale for why it is safe for a newcomer.
- **FR-1.9** All Bob output shall conform to a documented JSON schema (`ramp-manifest.json`) validated before the front end consumes it.
- **FR-1.10** The pipeline shall be packaged as a Bob skill and be executable against a different repository without code modification.
- **FR-1.11** For each module, Bob shall generate an explain-back prompt and a reference rubric listing the key concepts a correct explanation must cover.
- **FR-1.12** Bob shall evaluate a user-submitted free-text explanation against the module rubric and return a coverage score plus an itemized list of concepts missed or misunderstood.
- **FR-1.13** For each confirmed doc-drift finding, Bob shall generate corrected documentation text and a corresponding diff suitable for a pull request.
- **FR-1.14** Bob shall generate at least one injectable bug per module, recording the defect location, the introduced change, the observable symptom presented to the user, and the known-correct original for verification.
- **FR-1.15** Bug injection shall never modify the target repository's working tree; injected defects shall be applied only to an isolated copy or scratch branch.

### 4.2 Experience Layer

- **FR-2.1** The application shall render a home dashboard showing overall ramp-up progress, current level, XP, and the single next recommended action.
- **FR-2.2** The application shall render each module as a card displaying its summary, risk level, certification status, and available quests.
- **FR-2.3** The application shall render Mermaid diagrams inline without requiring the user to leave the app.
- **FR-2.4** The application shall present module quizzes one question at a time, score them on completion, and display the explanation for each answer.
- **FR-2.5** The application shall mark a user as certified on a module upon achieving a configurable pass threshold (default 80%).
- **FR-2.6** The application shall lock quests belonging to uncertified modules and clearly indicate the prerequisite.
- **FR-2.7** The application shall award and display badges upon achievement of defined milestones.
- **FR-2.8** The application shall display doc-drift findings as an actionable list, with the ability to mark a finding as confirmed or dismissed.
- **FR-2.9** The application shall persist user progress across sessions.
- **FR-2.10** The application shall present a metrics view showing time-to-first-certification, comprehension score, and comparison against the configured manual baseline.
- **FR-2.11** The application shall provide a free-text input for the explain-back challenge and display Bob's gap analysis as an itemized list of covered and missed concepts.
- **FR-2.12** The application shall allow a user to confirm or dismiss a doc-drift finding, and upon confirmation display Bob's drafted correction in an editable form before staging.
- **FR-2.13** The application shall maintain and display a contribution ledger of improvements the user has shipped during onboarding.
- **FR-2.14** The application shall present a sabotage challenge showing only the observable symptom, with a running timer and tiered hints available at defined XP costs.
- **FR-2.15** The application shall verify a submitted fix against the known-correct original and award the corresponding badge on success.
- **FR-2.16** The application shall clearly indicate to the user that sabotage operates on an isolated copy and cannot affect their real repository.

### 4.4 Runtime Intelligence (watsonx.ai)

- **FR-3.1** The system shall submit the user's explanation together with Bob's module rubric to a watsonx.ai foundation model for assessment.
- **FR-3.2** The model shall return strict JSON containing a numeric score, covered concepts, missed concepts, identified misconceptions, and human-readable feedback.
- **FR-3.3** The system shall validate the model response against the expected schema and reject or retry malformed output rather than displaying it raw.
- **FR-3.4** Inference shall use deterministic-leaning parameters so that repeated submissions of the same explanation produce materially consistent scores.
- **FR-3.5** The system shall authenticate using an IAM access token derived from an API key, and shall refresh the token on expiry (60-minute lifetime).
- **FR-3.6** No API key, IAM token, or project ID shall be committed to the repository or exposed in client-side code.
- **FR-3.7** If watsonx.ai is unavailable, the application shall degrade to multiple-choice certification without blocking the user's progression.
- **FR-3.8** The system shall not use any foundation model listed as out of scope for the hackathon.

### 4.5 Persistence (Cloudant)

- **FR-4.1** Generated manifests shall be persisted as documents keyed by repository identifier and commit.
- **FR-4.2** User progress — XP, level, certifications, badges, quest state, quiz history, contribution ledger — shall be persisted per user and survive session termination.
- **FR-4.3** The system shall support multiple concurrent users and multiple repositories within a single deployment.
- **FR-4.4** The team-lead view shall aggregate progress across users in read-only form without exposing individual quiz answers.
- **FR-4.5** The system shall compute and surface per-module first-attempt pass rates to identify modules that consistently confuse newcomers.
- **FR-4.6** Cloudant credentials shall be held server-side only and never exposed to the browser.

### 4.6 Spoken Explain-Back (Speech-to-Text)

- **FR-5.1** The application shall capture microphone audio with an explicit user-initiated start and stop, and display recording state at all times.
- **FR-5.2** Captured audio shall be transcribed via IBM Speech-to-Text and returned as editable text.
- **FR-5.3** The user shall be able to review and correct the transcript before it is submitted for grading.
- **FR-5.4** The corrected transcript shall be graded through the identical Module H path used for written explain-backs.
- **FR-5.5** A written input path shall remain available at all times as an accessibility and reliability fallback.
- **FR-5.6** The application shall request microphone permission explicitly and shall not record without visible indication.

### 4.7 CLI & Generation Driver

- **FR-6.1** The system shall provide a command that accepts a target repository path and generates a curriculum manifest for it.
- **FR-6.2** Generation shall invoke Bob Shell in non-interactive mode; the CLI shall not require the user to open Bob IDE.
- **FR-6.3** The system shall provide a command that starts a local server and opens the user's default browser to the Ramp interface.
- **FR-6.4** A single-argument invocation shall open an existing curriculum immediately and generate one only when absent.
- **FR-6.5** Generation shall stream progress to the terminal, including which subagents are active, rather than blocking silently.
- **FR-6.6** The system shall detect an existing manifest matching the repository and commit, and shall not regenerate unless explicitly instructed.
- **FR-6.7** All credentials shall be read from environment variables or a gitignored local environment file, never from committed source.
- **FR-6.8** The CLI shall verify Bob Shell availability and required credentials before beginning generation, and shall fail with an actionable message.
- **FR-6.9** Generation failure shall leave any previously valid manifest intact rather than overwriting it with partial output.

### 4.8 Non-Functional Requirements

- **NFR-1** Full curriculum generation for a mid-sized repository shall complete within a single Bob session budget appropriate to hackathon Bobcoin limits.
- **NFR-2** The application shall launch from a single terminal command with no configuration file, no account creation, and no compilation step, and shall open the user's browser automatically.
- **NFR-3** No credentials, API keys, or secrets shall be committed to the repository (enforced via the provided `.gitignore` / `.bobignore`).
- **NFR-4** The generated manifest shall be human-readable so a team can hand-edit or extend the curriculum.
- **NFR-5** The application shall be operable end-to-end within a 90-second demo without setup steps visible to the viewer.
- **NFR-6** Curriculum generation and application serving shall be separately invocable, so launching Ramp against an already-generated repository is instantaneous.
- **NFR-7** All credentials shall be held server-side only; no key, token, or connection string shall ever reach the browser.

---

## 5. Data Schema (core shape)

```json
{
  "version": "1.0",
  "repo": { "name": "...", "commit": "...", "generatedAt": "..." },
  "overview": { "purpose": "...", "techStack": [], "entryPoints": [], "setupSteps": [] },
  "modules": [{
    "id": "api-layer",
    "name": "API Layer",
    "summary": "...",
    "keyFiles": [],
    "dependencies": [],
    "complexity": "medium",
    "riskLevel": "high",
    "prerequisites": ["overview"],
    "quiz": [{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "explanation": "..."
    }],
    "explainBack": {
      "prompt": "In your own words, describe how a request flows through this module.",
      "rubric": [
        { "concept": "...", "weight": 1, "mustMention": ["..."] }
      ]
    },
    "sabotage": [{
      "id": "sab-001",
      "difficulty": "medium",
      "file": "...",
      "symptom": "Requests to /orders return 200 but the order is never persisted.",
      "injectedDiff": "...",
      "correctOriginal": "...",
      "hints": ["Narrow to the persistence layer.", "Check the transaction commit.", "Line 84 \u2014 the await is missing."]
    }],
    "quests": [{
      "id": "q-001",
      "title": "...",
      "type": "starter | doc-fix",
      "difficulty": "easy",
      "xp": 10,
      "files": [],
      "rationale": "..."
    }]
  }],
  "diagrams": [{ "type": "architecture", "title": "...", "mermaid": "..." }],
  "docDrift": [{
    "id": "drift-001",
    "docClaim": "...",
    "codeReality": "...",
    "location": "...",
    "severity": "high",
    "suggestedCorrection": "...",
    "correctionDiff": "..."
  }],
  "glossary": [{ "term": "...", "definition": "..." }],
  "dangerZones": [{ "path": "...", "reason": "...", "churn": 0, "coverage": 0 }],
  "badges": [{ "id": "...", "name": "...", "criteria": "..." }]
}
```

---

## 6. Judging Criteria Coverage

### Completeness and feasibility (5 pts)
- Full working pipeline from raw repo → structured artifact → usable interface, not a mockup
- Documented JSON schema and architecture show the idea is planned, not improvised
- IBM Bob application is explicit and central: Agent mode, subagents, parallel tasks, and document understanding each map to specific named features (A1–A7, B1)
- **The IBM stack is architecturally coherent, not accumulated:** Bob authors at build time (A, B, F, G), watsonx.ai grades at runtime (H), Cloudant persists (I), Speech-to-Text captures (J) — each occupies a distinct layer with no overlap, which directly answers "how clear is the application of IBM technology"
- `bob_sessions/` screenshots evidence every generation stage
- **Action:** Keep scope at P0/P1 (§7) so the submitted PoC is genuinely complete rather than broadly half-built

### Creativity and innovation (5 pts)
- The differentiator is **verification, not explanation** — Ramp is the only onboarding tool in this space that certifies comprehension rather than assuming it
- **Onboarding pays rent (Module F):** inverts the premise that onboarding is pure cost — the newest person on the team ships real documentation improvements on day one
- **Sabotage mode (Module G):** an AI that deliberately breaks code to teach is a mechanic judges will not see twice; it also encodes how developers genuinely learn systems
- **Spoken explain-back (Module J):** the dev verbally walks through a module and is graded on what they said — Ramp becomes a whiteboard interview simulator for the codebase you're joining, which is almost certainly unique in the field
- **Explain-back grading (B6–B8, H1–H3):** free-text comprehension assessment is a far stronger signal than multiple choice, and almost nobody attempts it
- Doc drift detection reframes stale documentation as a discoverable, scoreable, *fixable* asset
- **Action:** Lead the video and written statement with the pairing — *"certifies the developer and improves the codebase at the same time"* — not "AI explains your code." This framing carries the score.

### Design and usability (5 pts)
- **One terminal command to launch:** no deployment, no account creation, no configuration file — the same shape developers already expect from `jupyter notebook` or `storybook`, which is close to zero adoption friction
- Zero-config: one input (repo path), no setup wizard
- Visual quest board and progress dashboard rather than a wall of generated text
- Static front end runs anywhere with no build step (NFR-2), so adoption friction is near zero
- Clear next-action guidance at all times, so a new dev is never staring at a blank page wondering where to start
- **Action:** Invest real time in the front-end polish; this is the criterion most often lost to ugly demos

### Effectiveness and efficiency (5 pts)
- Directly targets a universally acknowledged, high-cost workflow with real dollar impact
- Produces hard numbers: time-to-first-certification, comprehension score, doc-health score (D1–D6)
- Scales across repos by design (E1–E4) — one skill, unlimited codebases
- Secondary scale path: the team-lead view turns a single-user tool into team infrastructure
- **Action:** Capture actual before/after numbers during the build so the claim is measured, not asserted

---

## 7. Build Priority (fit to remaining time)

### P0 — Must ship (the submission is not viable without these)
A1, A2, A3, A4, A7 · B1, B2, B3 · C1, C2, C4 · E1, E2 · **K1, K2, K3, K6, K7**
FR-1.1–1.10, FR-2.1–2.6, FR-6.1–6.4, FR-6.7, FR-6.8

### P1 — The differentiators; these are what make the submission memorable
**F1, F2, F3** (onboarding pays rent) · **B6, B7, B8** (explain-back) · **H1–H6** (watsonx.ai grading) · **I1–I3** (Cloudant persistence) · **K4, K5** · A6 · B5 · C3, C5 · D1, D3, D4
FR-1.11–1.13, FR-2.7, FR-2.8, FR-2.10–2.13, FR-3.1–3.8, FR-4.1–4.3, FR-4.6, FR-6.5, FR-6.6, FR-6.9

### P2 — Highest-impact stretch, build only if P0+P1 are solid
**J1–J4, J6** (spoken explain-back) · **G1, G2, G4, G6** (sabotage mode — core loop only) · I4, I5, I6 · F4, F5
FR-1.14, FR-1.15, FR-2.14–2.16, FR-4.4, FR-4.5, FR-5.1–5.6

### P3 — Only if genuinely ahead of schedule
A5 · B4 · C6 · D2, D5, D6 · E3, E4 · G3, G5 · I7 · J5

**Priority reasoning:** F (pays rent) is promoted into P1 because it costs little — you already have drift detection, and Bob generating the correction is one more call — but it transforms the pitch. H (watsonx.ai grading) sits in P1 because explain-back does not function without it; B6–B8 and H1–H6 are effectively one feature split across two layers, so they ship together or not at all. Cloudant's core persistence (I1–I3) is P1 because FR-2.9 depends on it, while the team-lead aggregation (I4–I6) is P2 polish. J (spoken explain-back) is your best creative asset and best demo footage, but it depends on H already working, so it cannot be attempted first — it sits at the top of P2 as the thing to build the moment P1 is stable. Sabotage (G) carries the most build risk of anything here: take it if the core is stable, drop it without regret if not.

**A warning about CLI polish.** K1–K3 and K6–K7 are P0 because Ramp does not launch without them, but argument parsing, spinners, colored output, and help text are seductive time sinks worth almost nothing to judges. Two commands that reliably work is the entire requirement. K4 (progress streaming) is the one piece of CLI polish that earns its place, because it produces demo footage proving Bob is doing the work.

**Scope discipline note:** Completeness is 25% of the score. A tight P0+P1 build that works flawlessly on camera will outscore a P2-ambitious build that stumbles during the demo. Freeze scope with roughly a third of your remaining time left and spend it on polish, the video, and the written statements.

---

## 8. Bob Feature Mapping (for the required usage statement)

| Bob capability | Where it's used in Ramp |
|---|---|
| Agent mode | Autonomous repo reconnaissance (A1) and starter-task mining (A7) |
| Subagents | One per codebase domain, isolated contexts, emitting structured module records (A2) |
| Parallel tasks | Domain subagents run concurrently to compress generation time (A2) |
| Document understanding | Ingesting existing README/docs to detect drift against code reality (A4) |
| Diagram generation | Mermaid architecture and sequence diagrams from code analysis (A3) |
| Skills | The whole pipeline packaged as a reusable, portable Bob skill (E1) |
| Bob Shell (non-interactive) | Invoked programmatically by the `ramp generate` command, making Bob a runtime component of the product rather than only a build-time tool (K1, K2) |
| Custom rules / modes | Enforcing the strict JSON output contract so downstream parsing is reliable (FR-1.9) |
| Evaluative reasoning | Grading free-text explain-back submissions against a generated rubric and producing itemized gap analysis (B6–B8) |
| Code generation | Drafting documentation corrections and PR-ready diffs from confirmed drift findings (F2) |
| Controlled code mutation | Generating realistic, module-appropriate injectable defects with known-correct originals for verification (G1) |

Record a task session screenshot for each of these stages — they double as evidence and as the backbone of your written Bob usage statement.

### IBM watsonx & Cloud services mapping

| Service | Role in Ramp | Features |
|---|---|---|
| watsonx.ai (Granite) | Runtime grading engine — assesses free-text and spoken explanations against Bob-authored rubrics | H1–H6 |
| IBM Cloudant | Document persistence for manifests, user progress, certifications, and the contribution ledger | I1–I7 |
| IBM Speech-to-Text | Voice capture for spoken explain-back, transcribed then graded through the watsonx.ai path | J1–J4 |

**The one-sentence version for your written statement:** *Bob authors the curriculum at build time; watsonx.ai grades the developer against it at runtime; Cloudant persists progress across sessions and users; Speech-to-Text lets the developer explain the codebase aloud rather than in a form.*

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Bobcoin exhaustion mid-build | Assign generation work to one owner; test prompts on a small repo before running the full pipeline |
| Bob emits prose instead of valid JSON | Lock the output contract early with custom rules; validate the manifest before the front end consumes it |
| Target repo too large (cost) or too trivial (nothing to teach) | Choose a mid-sized multi-module repo; Galaxium Travels is the documented fallback |
| Quiz questions are trivially easy or nonsensical | Human-review the generated quiz once and iterate the prompt; a bad quiz undermines the entire certification premise |
| Demo depends on live generation and fails on camera | Pre-generate a known-good manifest as a fallback, and show live generation only if it has run reliably several times |
| Explain-back grading is too lenient (passes everything) or too harsh | Test the rubric prompt against one deliberately vague answer and one good answer before demo; tune strictness once |
| Sabotage mode modifies the real repo | Enforce FR-1.15 — operate on a scratch copy only; verify this explicitly before recording |
| Injected bug is unrealistic or unfindable | Human-review the generated bugs; keep a hand-picked known-good sabotage case as the demo fallback |
| Bob's doc correction is wrong and gets shipped | F3 human-in-the-loop review is mandatory, not optional — never auto-stage a correction |
| New features (F, G) consume Bobcoins during testing | Test correction and injection prompts on a single small module before running across all modules |
| **IBM Cloud credentials leaked to public repo** | **Highest-severity risk on this project.** Detected credentials cause immediate deactivation and account suspension mid-hackathon. Use the provided repo template's `.gitignore`/`.bobignore`, keep keys in environment variables, never in client-side code, and choose "delete the leaked key" when creating the API key |
| watsonx.ai returns prose instead of parseable JSON | Constrain with an explicit output contract and low temperature; validate every response and retry on malformed output (FR-3.3) |
| Grading is inconsistent between identical submissions | Use deterministic-leaning parameters (FR-3.4); test the same answer three times before demo |
| IAM token expires mid-demo | Tokens live 60 minutes — refresh programmatically, and generate a fresh one immediately before recording |
| Credits burned unexpectedly | Inference is negligible ($0.0001/RU), but Jupyter notebook runtimes bill at $1.02/CUH — work via API/SDK and avoid leaving notebooks running |
| Microphone or Speech-to-Text fails on camera | J6 written fallback is mandatory, not optional; rehearse the spoken path several times and keep a tested transcript ready |
| Hackathon cloud account cannot host a deployment | Documented limitation — run locally and demo locally; do not architect around hosted deployment |
| Bob Shell 2.0 install blocks progress late in the build | Requires a fresh install with no upgrade path from 1.0.x — install and verify it in the first hours, not the last |
| Live generation is too slow for the demo | NFR-6 separates generation from serving; pre-generate the demo manifest, show generation starting, then cut to `ramp open` |
| CLI polish consumes build time | Two working commands is the requirement; skip flag parsing, help systems, and colored output |
