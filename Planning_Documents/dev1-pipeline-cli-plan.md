# Dev 1 — Pipeline & CLI Build Plan

**Owner:** Manish Chepuri (Dev 1)
**Tracks:** 1A (Bob generation), 1B (CLI), 1C (differentiators), 1D (demo prep)

Phase 0 is complete: Bob Shell 2.0 installed and verified, fixture manifest committed, API contract written.

---

## Dev Repo

**Chosen: `gothinkster/node-express-realworld-example-app`**
https://github.com/gothinkster/node-express-realworld-example-app

Node.js/Express blogging platform API (Conduit). ~800 lines, 5 natural subagent domains (auth, articles, comments, profiles, tags), existing README with setup instructions for drift detection. Not an IBM tutorial repo.

**Natural subagent domains:**
- `auth` — registration, login, JWT issuance (`routes/api/auth.js`, `config/passport.js`, `models/User.js`)
- `articles` — CRUD, slugs, favorites (`routes/api/articles.js`, `models/Article.js`)
- `comments` — comment lifecycle (`routes/api/comments.js`, `models/Comment.js`)
- `profiles` — follow/unfollow (`routes/api/profiles.js`)
- `tags` — tag listing (`routes/api/tags.js`)

---

## Sub-Task 1 — Dev Repo Setup & Bob Initialisation

**Intent:** Get Bob oriented on the development repo so subagent prompts have accurate context to work with.

**Expected Outcomes:**
- Dev repo cloned locally
- `/init` run in Bob IDE, producing `AGENTS.md` baseline context
- Bob can answer basic questions about the repo structure without hallucinating

**Todo List:**
1. Clone the chosen dev repo into a local directory (keep it separate from the Ramp repo)
2. Open Bob IDE, set workspace to the dev repo
3. Run `/init` — Bob will crawl the repo and generate `AGENTS.md`
4. Read the generated `AGENTS.md` and verify it correctly identifies: purpose, tech stack, entry points, and key directories
5. Screenshot this Bob session immediately — name it `ramp_dev1_task01_init.png` and add to `bob_sessions/`

**Relevant Context:** A1 in feature map. FR-1.1, FR-1.2. The AGENTS.md output becomes the shared context all subagents inherit.

**Status:** [ ] pending

---

## Sub-Task 2 — Custom Rules & Output Contract

**Intent:** Force Bob to emit strict JSON from the very first subagent run. This is the single most common failure mode — do it before writing any prompts.

**Expected Outcomes:**
- A custom rule file exists that instructs Bob to always respond in the exact manifest JSON schema shape
- Running any subagent prompt returns parseable JSON, not prose with JSON embedded in it

**Todo List:**
1. In Bob IDE, open Settings → Custom Rules (or `.bobconfig` rules section)
2. Add a rule: "All output must be valid JSON conforming to the ramp-manifest module schema. No prose, no markdown, no explanation outside the JSON object. If you cannot produce valid JSON, return `{ \"error\": \"generation failed\", \"reason\": \"...\" }`."
3. Add a rule: "Never truncate arrays. If a list has more than one item, include all items."
4. Test the rule by asking Bob to describe any function as a module record — verify the raw output is parseable with `JSON.parse()`
5. Screenshot this Bob session — `ramp_dev1_task02_custom_rules.png`

**Relevant Context:** FR-1.9. Do this before Sub-Task 3 or the parallel subagent run will produce unparseable output.

**Status:** [ ] pending

---

## Sub-Task 3 — Repo Reconnaissance Prompt (A1)

**Intent:** Write and test the prompt that produces the `overview` section of the manifest — repo purpose, tech stack, entry points, and setup steps.

**Expected Outcomes:**
- A single Bob Agent mode prompt that, given any repo with AGENTS.md context, emits a valid `overview` JSON object
- Output matches the schema: `{ purpose, techStack[], entryPoints[], setupSteps[] }`

**Todo List:**
1. Write the reconnaissance prompt (save it in `pipeline/prompts/01-overview.md`):
   - Instruct Bob to use Agent mode to explore the repo
   - Ask for: one-sentence purpose, tech stack array, entry point file paths, numbered setup steps from the README
   - Specify exact JSON output shape matching the manifest `overview` field
2. Run it against the dev repo in Bob IDE Agent mode
3. Verify the output: does `JSON.parse()` succeed? Are entry points real files? Are setup steps accurate?
4. Iterate the prompt until output is clean — usually 1–2 passes
5. Screenshot — `ramp_dev1_task03_overview_prompt.png`

**Relevant Context:** A1, FR-1.1, FR-1.2. The overview prompt runs once per repo as the first generation step.

**Status:** [ ] pending

---

## Sub-Task 4 — Parallel Subagent Pipeline (A2)

**Intent:** Define and test the subagent setup that produces all `modules[]` entries in parallel. This is the core of the generation pipeline.

**Expected Outcomes:**
- 3–4 subagents defined, each scoped to a codebase domain
- Each subagent emits a valid module record matching the manifest schema
- All subagents can run in parallel in a single Bob session
- Output for each module includes: id, name, summary, keyFiles, dependencies, complexity, riskLevel, prerequisites

**Todo List:**
1. Identify 3–4 domains in the dev repo (e.g. auth, articles, profiles, infrastructure)
2. Write the subagent orchestration prompt (save in `pipeline/prompts/02-subagents.md`):
   - Define each subagent with its domain scope and the files it should focus on
   - Specify that each runs in an isolated context
   - Each must emit a module record JSON object — specify exact field names and types
3. Add the complexity and riskLevel rating instructions: low/medium/high based on cyclomatic complexity, number of dependents, and test coverage
4. Run the full parallel subagent set against the dev repo
5. Collect all module JSON outputs and validate each against the manifest schema
6. Fix any subagent that emits prose or missing fields — iterate the prompt
7. Screenshot the parallel run — `ramp_dev1_task04_subagents.png`

**Relevant Context:** A2, FR-1.3, FR-1.4. This is the most Bobcoin-intensive step — test on a single subagent first before running all in parallel.

**Status:** [ ] pending

---

## Sub-Task 5 — Diagram Generation (A3)

**Intent:** Add Mermaid diagram generation to the pipeline — one architecture diagram and one sequence diagram per major flow.

**Expected Outcomes:**
- A prompt that produces valid Mermaid syntax for the codebase architecture
- A prompt that produces a sequence diagram for the most important request flow
- Both output as `diagrams[]` entries in the manifest schema: `{ type, title, mermaid }`

**Todo List:**
1. Write the architecture diagram prompt (save in `pipeline/prompts/03-diagrams.md`):
   - Instruct Bob to produce a `graph TD` Mermaid diagram showing major components and their connections
   - Output as JSON: `{ "type": "architecture", "title": "...", "mermaid": "..." }`
2. Write the sequence diagram prompt for the primary request flow (e.g. the auth flow):
   - Output as JSON: `{ "type": "sequence", "title": "...", "mermaid": "..." }`
3. Run both against the dev repo; paste the `mermaid` string into [mermaid.live](https://mermaid.live) to verify it renders without errors
4. Fix any Mermaid syntax errors by iterating the prompt constraints
5. Screenshot — `ramp_dev1_task05_diagrams.png`

**Relevant Context:** A3, FR-1.6. Dev 2 renders these inline — the Mermaid string must be valid syntax, not approximate.

**Status:** [ ] pending

---

## Sub-Task 6 — Doc Drift Detection (A4)

**Intent:** Write the prompt that ingests existing README/docs and flags contradictions against the actual code.

**Expected Outcomes:**
- A prompt using Bob's document understanding to compare docs against code
- Output is a valid `docDrift[]` array: each entry has `id, docClaim, codeReality, location, severity`
- At least 1–2 real drift findings on the dev repo (if the repo has none, the prompt still works — it returns an empty array)

**Todo List:**
1. Write the drift detection prompt (save in `pipeline/prompts/04-drift.md`):
   - Instruct Bob to ingest the README and any files in `docs/` using document understanding
   - Compare claims in the docs against actual code behaviour
   - For each finding: state what the doc claims, what the code actually does, where in the docs, and severity (high/medium/low)
   - Output as a `docDrift[]` JSON array
2. Run against the dev repo
3. Manually verify 1–2 findings are real contradictions, not hallucinations — read the referenced doc lines yourself
4. Screenshot — `ramp_dev1_task06_drift.png`

**Relevant Context:** A4, FR-1.5. Bob's document understanding feature is explicitly called out in the hackathon theme — this is one of the evidence shots for the Bob usage statement.

**Status:** [ ] pending

---

## Sub-Task 7 — Quiz & Rubric Generation (B1, FR-1.11)

**Intent:** Add quiz question and explain-back rubric generation to the pipeline. These feed directly into Dev 2's certification screens and Dev 3's `/grade` endpoint.

**Expected Outcomes:**
- Each module record is extended with a `quiz[]` array (3–5 MCQs with 4 options, correctIndex, explanation)
- Each module record is extended with an `explainBack` object (prompt string + rubric array)
- Output validates against the manifest schema

**Todo List:**
1. Write the quiz generation prompt (save in `pipeline/prompts/05-quiz.md`):
   - Given a module record (name, summary, keyFiles), generate 3–5 multiple-choice questions
   - Each question: text, 4 options, correctIndex (0–3), explanation of why the correct answer is right
   - Questions must be specific to this module — not generic programming questions
   - Output as a `quiz[]` JSON array
2. Write the explain-back rubric prompt (save in `pipeline/prompts/06-rubric.md`):
   - Given a module record, generate one explain-back prompt (a question asking the dev to explain the module)
   - Generate a rubric: 4–6 key concepts a correct explanation must cover, each with a weight (1 or 2) and mustMention keywords
   - Output as an `explainBack` JSON object
3. Run both against one module from the dev repo
4. Human-review the quiz: are the questions specific and meaningful? Is the correct answer actually correct?
5. Human-review the rubric: does it capture the genuinely important concepts?
6. Iterate the prompts once if needed — **a bad quiz destroys the certification premise**
7. Screenshot — `ramp_dev1_task07_quiz_rubric.png`

**Relevant Context:** B1, FR-1.7, FR-1.11. The rubric is passed verbatim to Dev 3's `/grade` endpoint — its quality directly determines grading quality.

**Status:** [ ] pending

---

## Sub-Task 8 — Starter Task Mining (A7)

**Intent:** Generate the `quests[]` array for each module — ranked candidate first tasks that are safe for a newcomer.

**Expected Outcomes:**
- Each module record is extended with a `quests[]` array
- Each quest has: id, title, type (`starter` or `doc-fix`), difficulty, xp, files[], rationale
- Quests are genuinely safe for a newcomer (low blast radius, no risky refactors)

**Todo List:**
1. Write the starter task mining prompt (save in `pipeline/prompts/07-quests.md`):
   - Instruct Bob to find TODOs, simple bug fixes, missing error handling, and low-complexity functions
   - Rate each by difficulty (easy/medium/hard) and assign XP (easy=10, medium=25, hard=50)
   - Explain why each task is safe for a newcomer (rationale field)
   - Drift-based doc-fix quests come from the `docDrift[]` array — include one `doc-fix` quest per confirmed drift finding
   - Output as a `quests[]` JSON array
2. Run against the dev repo
3. Verify the suggested files actually exist in the repo
4. Screenshot — `ramp_dev1_task08_quests.png`

**Relevant Context:** A7, FR-1.8, C1. XP values are fixed by the spec: easy=10, medium=25, hard=50.

**Status:** [ ] pending

---

## Sub-Task 9 — Assemble & Validate Full Manifest (FR-1.9)

**Intent:** Combine all subagent outputs into a single `ramp-manifest.json` and validate it against the schema before handing it to Dev 2 and Dev 3.

**Expected Outcomes:**
- A single valid `ramp-manifest.json` produced from the dev repo
- JSON parses without error
- All required fields are present on every module
- Dev 2 and Dev 3 can swap this for the fixture and everything works

**Todo List:**
1. Write a manifest assembly script (save in `pipeline/assemble.js` or `pipeline/assemble.py`):
   - Reads outputs from each subagent prompt run
   - Merges them into the full manifest shape from §5 of the feature map
   - Writes `ramp-manifest.json`
2. Write a schema validation step — either a simple JSON schema validator or a manual field check — that errors loudly on missing required fields
3. Run the full pipeline end-to-end on the dev repo and produce a real manifest
4. Send it to Dev 2 and Dev 3 — this is Sync 2 in the team plan
5. Screenshot the full generation run — `ramp_dev1_task09_full_manifest.png`

**Relevant Context:** FR-1.9, E2. This is Sync 2 — the moment Dev 2 and Dev 3 switch from the fixture to real output.

**Status:** [ ] pending

---

## Sub-Task 10 — CLI Entry Point (Track 1B)

**Intent:** Build the `ramp` CLI so generation and serving are both invokable from the terminal. This is what makes Ramp a developer tool rather than a script.

**Expected Outcomes:**
- `ramp generate <repo>` runs the Bob Shell pipeline and writes `ramp-manifest.json`
- `ramp open` starts the local server and opens the browser
- `ramp <repo>` does both in sequence if no manifest exists, or just opens if one does
- Preflight check fails with a clear message if Bob Shell is missing or credentials are absent
- Generation progress streams to the terminal (this is the demo footage shot)
- Failed generation never overwrites a previously valid manifest

**Todo List:**
1. Create `cli/` directory; initialise as a Node.js package (`package.json` with a `bin` entry pointing to `cli/index.js`)
2. Implement `ramp generate <repo>`:
   - Read repo path from argument
   - Run preflight: check `bob` is on PATH, check required env vars exist — fail with actionable message if not
   - Invoke Bob Shell non-interactively, streaming stdout to the terminal
   - On success, write manifest to `<repo>/ramp-manifest.json`
   - On failure, leave any existing manifest intact
3. Implement `ramp open`:
   - Start the local backend server (Dev 3's server, or a placeholder for now)
   - Open `http://localhost:<port>` in the default browser using the `open` package
4. Implement `ramp <repo>` convenience path:
   - Check if `ramp-manifest.json` exists for this repo
   - If yes: run `ramp open`
   - If no: run `ramp generate <repo>` then `ramp open`
5. Implement manifest caching: hash repo path + current git commit; skip generation if manifest was built from the same commit
6. Implement env config: read from `process.env` or a `.env` file (gitignored); never from committed code
7. Test all three commands end-to-end

**Relevant Context:** K1–K7, FR-6.1–6.9. K4 (progress streaming) is the one CLI feature worth building carefully — it produces the demo footage shot proving Bob is doing the work.

**Status:** [ ] pending

---

## Sub-Task 11 — Package as Bob Skill (E1)

**Intent:** Package the entire generation pipeline as a reusable Bob skill so it runs identically against any repo without code modification.

**Expected Outcomes:**
- A Bob skill exists in `pipeline/ramp.skill` (or equivalent Bob skill format)
- Running the skill against a new repo produces a valid manifest with no prompt editing
- The skill is the thing `ramp generate` invokes via Bob Shell

**Todo List:**
1. Review Bob IDE skill packaging documentation
2. Wrap the prompts from Sub-Tasks 3–8 into a single skill with parameterised repo path input
3. Test the skill against the dev repo — output should be identical to the manual prompt runs
4. Test the skill against a second small repo to verify portability — fix any repo-specific assumptions in the prompts
5. Screenshot — `ramp_dev1_task11_skill.png`

**Relevant Context:** E1, E2, FR-1.10, D12. This is the feature that makes the re-runnability claim literally true and makes Bob a runtime component of the product.

**Status:** [ ] pending

---

## Sub-Task 12 — Differentiator Generation (Track 1C — build only after 1A is solid)

**Intent:** Add doc correction generation and sabotage case generation to the pipeline.

**Expected Outcomes:**
- For each confirmed drift finding, Bob can generate corrected text + a PR-ready diff
- For each module, Bob can generate one injectable bug with location, symptom, correct original, and hints
- Injection is verified to operate only on a scratch copy — never the real repo

**Todo List:**
1. Write the doc correction prompt (save in `pipeline/prompts/08-correction.md`):
   - Given a drift finding (docClaim, codeReality, location), generate corrected documentation text
   - Generate a unified diff of the change
   - Output as `{ suggestedCorrection, correctionDiff }` — these are added to the drift finding object in the manifest
2. Write the sabotage generation prompt (save in `pipeline/prompts/09-sabotage.md`):
   - Given a module record, generate one realistic injectable bug (off-by-one, dropped await, wrong operator, inverted condition)
   - Output: file path, the injected diff, the observable symptom (what the dev is told), the correct original, and 3 tiered hints
   - Output as a `sabotage[]` JSON array entry
3. Write the isolation guard: before any injection, copy the target file to a temp directory — verify the real file is unchanged after injection
4. Run correction generation on 1–2 drift findings from the dev repo; human-review the diff is correct
5. Run sabotage generation on 1 module; verify the bug is realistic and the symptom is accurate
6. Screenshot — `ramp_dev1_task12_differentiators.png`

**Relevant Context:** F2, G1, G6, FR-1.13, FR-1.14, FR-1.15. **Cut this entire sub-task if behind.** Sabotage is P2; correction can be hand-written as a fallback.

**Status:** [ ] pending

---

## Sub-Task 13 — Demo Prep (Track 1D — final phase only)

**Intent:** Run the full pipeline against the sealed demo repo and commit a fallback manifest before recording day.

**Expected Outcomes:**
- Demo repo chosen (similar language and size to dev repo, per D14)
- Full generation runs successfully against it — valid JSON, sensible module names
- Generated manifest committed to the repo as the recording fallback
- Dev 2 and Dev 3 have not seen the demo repo contents

**Todo List:**
1. Choose the demo repo — same language and rough size as the dev repo; different enough that Dev 2 and Dev 3 have no familiarity with it
2. Clone it locally — do not push it or discuss its contents with Dev 2 or Dev 3
3. Run `ramp generate <demo-repo>` — verify the output is valid JSON and module names make sense
4. Do NOT read the code to understand it — only verify generation succeeded
5. Commit the generated manifest to the Ramp repo as `fixtures/demo-manifest.json` (the recording fallback)
6. Confirm Dev 2 and Dev 3 have not cloned or read the demo repo

**Relevant Context:** D14, D15. This sub-task is last intentionally — the demo repo must stay sealed until measurement day.

**Status:** [ ] pending

---

## Cut order if behind

1. Sub-Task 12 (differentiators) — entire track is cuttable; sabotage is P2, correction can be faked
2. Sub-Task 13 step 5 (demo manifest fallback) — nice to have, not blocking
3. Sub-Task 8 (starter task mining) — quests can be hand-written if generation is unreliable

**Never cut:** Sub-Tasks 4, 9, 10, 11 — the subagent pipeline, manifest assembly, CLI, and skill are the submission.
