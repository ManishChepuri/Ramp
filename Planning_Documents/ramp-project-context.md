# Ramp — Project Context & Decision Log

**Companion to `ramp-feature-map-and-requirements.md`**

That document is the *what*. This one is the *why*, plus the hackathon logistics and constraints that shaped every decision. Read this first if you weren't part of the planning conversation.

---

## 1. Hackathon Logistics

### Hard facts

| Item | Detail |
|---|---|
| Event | IBM TechXchange 2026 Pre-conference Dev Day Hackathon |
| Theme | Build with purpose using IBM Bob 2.0 |
| Hackathon window | Aug 28, 12:45 PM ET → Aug 30, 2:30 PM ET |
| **Submission deadline** | **10:00 AM ET, August 30, 2026** |
| Team size | 1–5 participants (we are 3) |
| Bob budget | 40 Bobcoins per individual account |
| Cloud budget | $80 per team IBM Cloud account |
| Account closure | Bob access ends Sept 1; team cloud account closes end of day Sept 1 |

The deadline is 10:00 AM, not 2:30 PM. The hackathon window closing later is irrelevant — all work must be finished by the submission deadline, and continuing to modify deliverables after it risks disqualification.

### Theme, verbatim

> Create a solution that improves a specific developer workflow, such as onboarding, debugging, code review, testing, application maintenance, or release and deployment processes. Start by clearly defining a problem where time, effort, or errors are too high today. Then, using IBM Bob 2.0, build a working prototype on a real or sample project that demonstrates a full solution to improve the specified workflow. Leverage features like Agent mode, parallel tasks, subagents, and document understanding to manage and improve multiple steps, not just assist with coding. Clearly demonstrate impact.

Two phrases matter most: **"not just assist with coding"** (Bob must orchestrate multi-step work, not autocomplete) and **"clearly demonstrate impact"** (we need numbers, not adjectives).

### The four deliverables

1. **Demo video** — max 3 minutes, publicly accessible URL. Judges will not watch past 3 minutes. Brief problem framing, but **at least 90 seconds showing the solution running on screen**, with narration. Must clearly demonstrate how Bob was used. YouTube, Vimeo, or Google Drive hosting also unlocks automated feedback.
2. **Problem and solution statement** — 500 words or less. Problem, solution, target users, how they interact with it, why it's creative and unique.
3. **Bob usage statement** — clear, specific detail on how and where Bob was used, plus watsonx if applicable. Vague answers score poorly.
4. **Code repository** — public GitHub/GitLab/Bitbucket link, containing the implementation *and* a `bob_sessions` folder with every team member's Bob task session screenshots.

Submit through the Submissions section of the My Team page. Drafts can be saved and resubmitted; **resubmission requires re-entering all four deliverables**, not just the changed one. The most recent submission is the official one.

### Judging — 20 points, averaged across judges

| Criterion | Points | What it actually asks |
|---|---|---|
| Completeness and feasibility | 5 | Is it feasible, fully thought out, a complete PoC, with clear application of IBM technology? |
| Creativity and innovation | 5 | Unique and original approach? Differentiated in the market? |
| Design and usability | 5 | Good design and UX? How quickly could real users adopt it? |
| Effectiveness and efficiency | 5 | High-priority problem? Achieves its goal? Measurable impact? Potential to scale? |

**Completeness is 25% of the score.** This single fact drives our scope discipline: a tight build that works flawlessly on camera beats an ambitious build that stumbles.

### Prizes

1st: $2,000 + TechXchange conference tickets with travel and lodging. 2nd: $1,000. 3rd: $500. Top 50 qualified submissions receive conference tickets without travel.

### AI Submission Advisor

An automated reviewer emails feedback after submission, checking whether the video communicates the solution and Bob's contribution, whether the written statements are specific, and whether the repo is public and contains the session screenshots. It flags weak areas as "needs a second look." **It does not influence judging** — but submitting a draft early enough to receive and act on this feedback is free insurance.

---

## 2. Non-Negotiable Requirements

### Bob IDE is mandatory

Any framework or technology may be used, but the solution must showcase **IBM Bob IDE as a core component** to be eligible for judging. Bob Shell is optional and does not substitute for IDE usage.

### Proof of Bob usage — the screenshot requirement

This appears **six times** across the guide and competition site, twice flagged "Important," with its own dedicated section. It is one of only four things the automated advisor checks.

**The process:**
1. Create a `bob_sessions` folder in the submission repo.
2. In Bob IDE's chat interface, select **Tasks**.
3. Select a task related to the project; confirm the correct workspace (use **All** if work spans workspaces).
4. Click the **task header** to display the task session consumption summary.
5. Screenshot it. PNG preferred for text clarity.
6. Name it clearly: `teamname_task01_short_description.png`.
7. Repeat for **all** relevant tasks, from **every team member**.

**Capture these continuously, not at the end.** Task history is tied to individual Bob accounts and access ends Sept 1. A strong project with an empty `bob_sessions` folder is a broken submission.

### Data rules

Bring your own data. Public website data is permitted if terms allow commercial use — keep a list of sources. **No client data, no confidential data, no personal information, no social media data.**

### Credential safety — highest-severity operational risk

If IBM Cloud credentials are detected in a public repository, the credential is deactivated immediately and the cloud account is **suspended**. Recovery requires removing the credential from all public sources, rotating it, and contacting hackathon support.

Mitigations: use IBM's GitHub hackathon repository template (ships with `.gitignore` and `.bobignore`), keep credentials in environment variables server-side only, never in client-side code, and select "delete the leaked key" when creating the API key.

### Out-of-scope watsonx.ai models

Do not use `llama-3-405b-instruct`, `mistral-medium-2505`, or `mistral-small-3-1-24b-instruct-2503`. Using them can negatively affect judging.

### Other constraints

- Hackathon cloud accounts **do not support solution deployment** — run locally and demo locally.
- watsonx.ai out of scope: Agent Lab, bring-your-own-model, fine tuning, AutoAI, AI governance, Evaluation Studio, SPSS Modeler.
- watsonx Orchestrate out of scope: AgentOps (Preview).

---

## 3. Cost Model

**Bobcoins (40 per person).** Every Bob AI interaction consumes them. At 100% usage no more are provided. Divide tasks across teammates to use the full pooled allocation. Test prompts on small repos before running full pipelines.

**IBM Cloud ($80 per team).** Notifications at 25%, 50%, 80%; account suspended at 100%. Notifications send hourly, so credits can be exhausted before an alert arrives.

**Where the money actually goes:**
- Foundation model inference: 1,000 tokens = 1 RU = $0.0001. Grading calls are trivially cheap — thousands of them won't dent $80.
- **Jupyter notebook runtimes: $1.02 per capacity unit hour.** This is the real risk. Work via API/SDK, not notebooks, and never leave a notebook running.

---

## 4. Decision Log

### D1 — Workflow: onboarding

**Chose:** developer onboarding to unfamiliar codebases.
**Why:** universal pain, easy to demo, natural fit for Bob's subagent and document-understanding features.
**Known risk:** it is the single most predictable submission for this theme. Everything in D4–D7 exists to counteract that.

### D2 — Bob is the build engine, not an embedded runtime feature

**Decided:** Bob is what generates the curriculum; it is not a chat window inside the shipped product.
**Why:** "core component" means core to how the solution was built and operates, not that end users interact with Bob. There is no requirement for AI to run inside the delivered app.
**Consequence:** proof of Bob usage comes from session screenshots, the written statement, and visible Bob activity in the video — not from the product's UI.

### D3 — The product must be re-runnable, not a one-time artifact

**Decided:** package the generation pipeline as a Bob skill so it runs against any repository.
**Why:** a one-off generated document scores weakly on "potential to scale to more users or use cases." A tool that regenerates on demand is a product; a document is an output.

### D4 — Reframe from explanation to **certification**

**The pivot.** Most AI onboarding tools explain code faster. Ramp verifies the developer actually understood it.
**Why:** explanation is commodity; certification is a different product category. This is the primary differentiator and the framing that carries the Creativity score.

### D5 — Onboarding pays rent

**Decided:** doc-drift findings become the new dev's first quests; Bob drafts the correction, the dev reviews it, and the fix ships.
**Why:** inverts the premise that onboarding is pure cost. The person who knows least about the codebase improves it on day one. Cheap to build given drift detection already exists, and it transforms the pitch.

### D6 — Explain-back grading

**Decided:** free-text (and spoken) explanations graded against a Bob-authored rubric, returning itemized gaps rather than a bare score.
**Why:** far stronger comprehension signal than multiple choice, and almost nobody attempts it.

### D7 — Sabotage mode

**Decided:** Bob plants a realistic bug; the dev hunts it under a timer.
**Why:** you learn a codebase by debugging it, not reading it. Best demo footage in the spec. Highest build risk, so it sits in P2 — take it only if the core is stable.

### D8 — watsonx.ai fills a real architectural gap

**Decided:** Bob authors at build time; watsonx.ai grades at runtime; Cloudant persists.
**Why:** Bob runs in the IDE and cannot be called by a deployed app, but explain-back grading needs inference at submission time. watsonx.ai is the only correct answer. This makes the IBM stack a designed architecture rather than a product checklist — which directly serves the "clear application of IBM technology" language in Completeness.

### D9 — Spoken explain-back via Speech-to-Text

**Decided:** the developer explains a module aloud; STT transcribes; watsonx.ai grades the transcript.
**Why:** the Feynman technique is verbal, and this is how comprehension is tested in real architecture reviews and interviews. Reframes Ramp as a whiteboard interview simulator for the codebase you're joining. Also films better than any other feature.

### D10 — Form factor: CLI-launched local web app

**Decided:** terminal command generates the curriculum, starts a local server, and opens the browser. Not an IDE extension, not hosted SaaS.
**Why:** matches the mental model developers already have from `jupyter notebook`, `storybook`, and `vite`. Keeps Ramp inside the developer's workflow. Extensions were rejected on build cost, harder microphone access for Module J, and worse demo footage than a full-screen browser app.

### D11 — Generation and serving are separate commands

**Decided:** `ramp generate <repo>` and `ramp open`, with a convenience path that generates only when a manifest is missing.
**Why:** generation takes minutes; serving is instant. Collapsing them would mean waiting through generation on every launch — unacceptable for repeat use and fatal in a 90-second demo.

### D12 — Bob Shell as a runtime component

**Decided:** the generation driver invokes Bob Shell non-interactively.
**Why:** changes Ramp from "we used Bob and saved the output" to "Ramp invokes Bob's agent pipeline as part of its operation." Makes the re-runnability claim literally true and is a stronger answer to the core-component requirement.
**Caveat:** does not replace the Bob IDE usage obligation. Bob Shell 2.0 needs a fresh install with no upgrade path from 1.0.x — install early.

### D13 — A thin backend is mandatory

**Corrected an earlier contradiction.** The original spec required a static-only front end while also requiring server-side credentials — impossible. A purely static site would ship API keys to the browser, which is the exact scenario that gets the cloud account suspended.
**Decided:** thin backend serving the app and proxying watsonx.ai and Cloudant. Roughly four endpoints. Keep business logic out of it.

### D14 — Two repositories: a development repo and a sealed demo repo

**Decided:** build and debug against one open-source repo; demo and measure on a second, kept sealed.
**Why:** during development the team reads Bob's output constantly — checking module summaries for accuracy, debugging against structure. Everyone ends up knowing the dev repo well, which destroys the "cold developer onboarding live" premise. A second untouched repo preserves genuine unfamiliarity for the demo.
**Constraints:**
- Both repos must be similar in shape — same language, comparable framework, similar size class, both with existing documentation. Diverging here means subagent prompts get quietly tuned to the dev repo and misbehave live.
- Only the pipeline owner touches the demo repo, and only to verify generation succeeds (valid JSON, sensible module names) — never to read and understand the code.
- The other two teammates should not clone it.
- Budget Bobcoins for generating twice.
- Run at least one full generation against the demo repo before recording day. The first run must not be on camera.

**Repo selection criteria (both):** multi-module, a few thousand lines, existing documentation to detect drift against (no docs means Module F has nothing to work with), not so large that subagents exhaust the Bobcoin budget.

**Rejected:** Galaxium Travels as the primary. It is IBM's own Bob tutorial app, so many teams will demo on it and the submission blends in. It also undercuts the core demo device — "my teammate has never seen this codebase" is not credible about a published tutorial repo. Retained as fallback only.

### D15 — Measurement: split-subject timed head-to-head

**Decided:** two different cold teammates, same five questions about the demo repo, one working manually and one using Ramp.

- **Person A** answers manually, timed. This is the baseline.
- **Person B** answers using Ramp, timed. This is the result.

**Why split rather than before-and-after on one person:** a single person doing the manual pass first learns the codebase, contaminating their Ramp run. Splitting keeps both subjects genuinely cold at their moment of measurement.

**Second benefit:** Person B's run *is* the demo footage. The measurement and the demo are the same recording, so the impact numbers are visibly earned on camera rather than asserted over a slide.

**The five questions** should be specific and verifiable — for example: where is authentication handled; what happens when a request hits a given endpoint; which module is riskiest to change; what breaks if a named function changes; where is the data model defined. Record both time and correctness.

**Claim format for the video and written statement:** *"We timed a developer answering five questions about this codebase manually: N minutes, X of 5 correct. With Ramp: M minutes, Y of 5."* Specific and honest beats impressive and vague.

### D16 — Single narrator for the video

**Decided:** one person narrates the entire video over everyone's screen recordings.
**Why:** multiple narrators produce mismatched audio levels, inconsistent mic quality, and uneven pacing — one of the most common ways teams lose Design and usability points on an otherwise good submission.
**Exception:** the spoken explain-back segment. A second, different voice actually talking to Ramp makes the feature visibly real rather than staged.

### Other workflow themes

Explored before settling on onboarding. Kept here in case a pivot is ever needed:

- **Debugging:** bug archaeology agent (walks git history backward to find why a bug was introduced); flaky test detective (clusters CI failures to separate nondeterminism from real breakage).
- **Code review:** review-intent reconstructor (flags where a diff doesn't match its ticket — scope creep, dropped requirements); blast-radius analyzer (risk map of downstream dependents per PR).
- **Testing:** test-suite auditor (finds tests that pass vacuously or mock away the thing under test — "your coverage number is a lie"); mutation-testing copilot.
- **Maintenance:** dependency upgrade impact simulator (reads changelogs, cross-references actual usage, generates the migration diff); tech-debt triage board scored by cost-to-fix vs risk-of-leaving.
- **Release:** release confidence report (go/no-go briefing from commits, config diffs, migrations); config drift reconciler (runbooks vs actual IaC).

The strongest alternatives were **blast-radius analyzer** and **release confidence report** — both produce a single striking output screen and use parallel subagents naturally.

### Gamification ideas not adopted

- **Codebase explorer map / skill tree** — best visual, highest front-end cost. P3.
- **Onboarding leaderboard** — good for teams onboarding several people; partially absorbed into the Cloudant team-lead view.

### watsonx integrations not adopted

- **Orchestrate for the doc-fix approval workflow** — architecturally correct for the F2–F3 human-in-the-loop step, but a meaningful build cost.
- **Orchestrate mentor agent** — coordinator routing questions to per-module specialists. Most impressive, heaviest lift.
- **NLU on commit history** — enrich the "why does this weird code exist" layer. Marginal next to the others.
- **Text-to-Speech audio briefing** — narrated module walkthrough for a commute. Cheap and pleasant, but additive rather than transformative.

### Building Ramp with a non-Bob AI tool

**Rejected.** The requirement is that Bob be core to how the solution was built, evidenced by session screenshots and a usage statement that must match reality. Building elsewhere and retrofitting Bob evidence is a disqualification risk and hands away the exact work judges want to see Bob doing. Scaffolding the static front-end shell elsewhere is defensible; the generation pipeline is not.

---

## 6. Team Plan

### Roles (3 people)

**Bob Pipeline Owner** — Bob skill and subagent setup, generation prompts, output contract, diagram generation, drift detection. Screenshots every session.

**Output & Presentation Owner** — the browser front end, manifest parsing, quest board, quiz and explain-back UI, progress dashboard. Tests the full flow before recording.

**Demo & Submission Owner** — repo setup from IBM's template, video script and recording, both written statements, submission dry run.

Rotate as needed; the split exists to spread Bobcoin usage across three individual allocations.

### Sequence

1. **Setup first** — Bob invite emails, IBMids, Bob IDE v2.0.x, confirm the `ibm-coding-challenge-uat` instance, request the team cloud account (allow 2 hours for activation), install Bob Shell 2.0.
2. **Build P0**, capturing screenshots continuously.
3. **Build P1** — the differentiators.
4. **Freeze scope** with roughly a third of the remaining time left.
5. **Write, record, assemble, submit early** to trigger advisor feedback.
6. **Revise and resubmit** all four deliverables before 10:00 AM ET.

### Choosing the target repositories

**Two repos, not one** (see D14). A development repo to build and debug against, and a sealed demo repo for measurement and recording. Both open source, similar in language, framework, size class, and both with existing documentation.

Only the pipeline owner touches the demo repo, and only to confirm generation produces valid output. The other two teammates stay cold — they are the measurement subjects (see D15).

Galaxium Travels is retained as a fallback only, not the primary choice.

---

## 7. Demo Video Plan

Three minutes maximum, at least 90 seconds of the solution running. **One narrator throughout** (D16), except the spoken explain-back segment.

**The central device:** the demo and the measurement are the same footage. Person B's timed cold run using Ramp (D15) *is* the product demo, so the impact numbers are visibly earned on screen rather than claimed over a slide.

- **Open (~15s):** the problem, stated concretely. Not generic — a specific costly moment.
- **The line:** *"Ramp certifies the developer and improves the codebase at the same time."*
- **Terminal (~10s):** `ramp generate` — Bob's subagents visibly spinning up. This is the Bob evidence shot. Cut away before it finishes.
- **Product (90s+):** `ramp open`, dashboard, module with diagrams, quiz, **spoken explain-back with live gap analysis**, quest board showing a doc fix shipping. Filmed as Person B's timed run.
- **Impact (~20s):** the head-to-head numbers — manual time and correctness vs Ramp time and correctness.
- **Close:** re-runnable against any repository.

**Pre-generate the demo manifest** and keep a local JSON fallback so a Cloudant or watsonx outage during recording costs nothing. Run generation against the demo repo at least once before recording day — the first run must not be on camera.

---

## 8. Open Questions

### Resolved
- ~~Which repository are we targeting?~~ → Two open-source repos, dev and demo, kept separate (D14). *Specific repos still to be chosen.*
- ~~How do we measure the baseline?~~ → Split-subject timed head-to-head, five questions, two cold teammates (D15).
- ~~Who records the video?~~ → One narrator throughout, except the spoken explain-back (D16).

### Still open — blocking

1. **Is the team IBM Cloud account active?** Requested — confirm all three members received and accepted the invite. Two-hour activation window.
2. **Is Bob Shell 2.0 installed and verified?** P0 dependency for `ramp generate`. Fresh install required, no upgrade path from 1.0.x. Without it, generation falls back to manual IDE runs, which weakens the runtime-component story in D12.
3. **Is the manifest schema locked and the fixture written?** This is the real Phase 0 blocker — Dev 2 and Dev 3 cannot start without the fixture manifest.

### Still open — not blocking

4. **Which development repo?** Dev 1's call, needed only when ready to test the pipeline (roughly an hour or two into the build). Any mid-sized multi-module repo with documentation works; swapping later is cheap because the subagent prompts are generic.
5. **Which demo repo?** Not needed until the measurement and recording phase. Should match the dev repo in language and size class (D14).
6. **What are the five measurement questions?** Written by Dev 1 once the demo repo is chosen, since Dev 2 and Dev 3 must stay cold.
7. **Who is Person A and who is Person B** for the head-to-head? Must be Dev 2 and Dev 3 — Dev 1 touches the demo repo and is disqualified as a subject.
8. **Which teammate narrates?** Affects nothing until recording day.

**Correction to an earlier assumption:** repository selection was originally treated as blocking all three tracks. It is not. The manifest schema is repo-agnostic, the fixture manifest can describe a fictional application, and neither Dev 2 nor Dev 3 ever touches a target repo. Only Dev 1 needs one, and not immediately.

---

## 9. Standing Warnings

1. **Screenshot every Bob session immediately.** Access ends Sept 1.
2. **Never commit credentials.** Suspension mid-hackathon is the worst realistic outcome.
3. **Avoid Jupyter notebooks.** $1.02/CUH is the only real way to burn the $80.
4. **Freeze scope early.** Completeness is 25% of the score.
5. **Submit a draft with time to spare.** Resubmission requires all four deliverables again.
6. **Sabotage mode must never touch the real repository.** Verify isolation before recording.
7. **Stop all work at 10:00 AM ET, Aug 30.** Continued changes to deliverables risk disqualification.
8. **Keep the demo repo sealed.** Only the pipeline owner touches it, and only to verify generation. If Person A or Person B reads that codebase, the measurement is worthless and the demo premise collapses.
9. **Run generation on the demo repo before recording day.** The first run must never be on camera.
