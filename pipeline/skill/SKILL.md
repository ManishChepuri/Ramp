---
name: ramp-generate
description: Use when the user wants to generate a Ramp manifest for a repository — runs the full pipeline (overview, subagents, diagrams, drift detection, assembly) and writes ramp-manifest.json.
metadata:
  argument-hint: "[repo-path]"
---

# Ramp Manifest Generation Pipeline

Generates a complete `ramp-manifest.json` for any Node.js/Express repository.
Follows the Ramp manifest schema exactly. All output must be valid JSON per `.bob/rules/ramp-output-rules.md`.

---

## Step 0 — Read context

Before doing anything:
1. Read `AGENTS.md` at the repo root for codebase context. If it does not exist, read `README.md` and `src/main.ts` (or `src/index.ts` or `app.js`) to orient yourself.
2. Read `.bob/rules/ramp-output-rules.md` — the output contract all steps must satisfy.
3. Note the repo path. All file paths in the manifest must be relative to this repo root.

---

## Step 1 — Overview (runs once)

Use the instructions in `pipeline/prompts/01-overview.md` to produce the `overview` object.

If that file does not exist, produce a JSON object with exactly these fields:
- `purpose` — one sentence describing what the application does
- `techStack` — array of strings from `package.json` dependencies + devDependencies
- `entryPoints` — array of real file paths (verify they exist)
- `setupSteps` — array of steps from the README

Write the output to `pipeline/output/01-overview.json`.
Validate: `JSON.parse()` must succeed, all 4 fields must be present and non-empty arrays/strings.

---

## Step 2 — Module subagents (run in parallel)

Identify the natural domain modules of this repository (aim for 3–5). For each domain:
- Read all source files in that domain
- Produce a complete module record conforming to the schema in `.bob/rules/ramp-output-rules.md`
- Write the output to `pipeline/output/02-module-<id>.json`

Required fields on each module record:
`id`, `name`, `summary`, `keyFiles`, `dependencies`, `complexity`, `riskLevel`, `prerequisites`, `quiz`, `explainBack`, `sabotage`, `quests`

Constraints (enforced by the output rules):
- `quiz`: ≥3 questions, each with exactly 4 options, correctIndex 0–3, explanation
- `explainBack.rubric`: 4–6 items, each with weight 1 or 2, mustMention ≥2 keywords
- `sabotage`: ≥1 item, each with exactly 3 hints
- `quests`: ≥1 item, each with xp ∈ {10, 25, 50} and type ∈ {starter, doc-fix}
- All file paths in `keyFiles` and `quests[].files` must exist in the repo

Validate each output file with `JSON.parse()` before moving on.

---

## Step 3 — Diagrams (runs once)

Use the instructions in `pipeline/prompts/03-diagrams.md` to produce the `diagrams` array.

If that file does not exist, produce a JSON array with exactly two items:
1. `{ "type": "architecture", "title": "...", "mermaid": "graph TD\n..." }` — shows all major layers and their connections
2. `{ "type": "sequence", "title": "...", "mermaid": "sequenceDiagram\n..." }` — shows the most important request flow end-to-end

Mermaid rules:
- All node IDs referenced in edges must be declared
- No unescaped quotes in labels
- Newlines inside the JSON string value must be `\n` (escaped), not literal newlines

Write the output to `pipeline/output/03-diagrams.json`.

---

## Step 4 — Doc drift detection (runs once)

Use the instructions in `pipeline/prompts/04-drift.md` to produce the `docDrift` array.

If that file does not exist:
- Read `README.md` and any files in `docs/` or `e2e/`
- Compare every factual claim against the actual source code
- For each genuine contradiction, produce a DocDriftItem with:
  `id`, `docClaim`, `codeReality`, `location`, `severity`, `suggestedCorrection`, `correctionDiff`
- severity must be `high`, `medium`, or `low`

Write the output to `pipeline/output/04-drift.json`.
If no drift is found, write `[]`.

---

## Step 5 — Assemble and validate

Run the assembly script:
```
node pipeline/assemble.js
```

If `pipeline/assemble.js` does not exist, assemble manually:
1. Load all output files from `pipeline/output/`
2. Get the current git commit: `git rev-parse --short HEAD`
3. Build the manifest object:
```json
{
  "version": "1.0",
  "repo": { "name": "<repo-name>", "commit": "<sha>", "generatedAt": "<ISO timestamp>" },
  "overview": <01-overview.json>,
  "modules": [<all 02-module-*.json in dependency order>],
  "diagrams": <03-diagrams.json>,
  "docDrift": <04-drift.json>
}
```
4. Write to `ramp-manifest.json` at the repo root
5. Verify `JSON.parse(fs.readFileSync('ramp-manifest.json'))` succeeds

---

## Step 6 — Report

Print a summary:
```
✓ ramp-manifest.json written
  modules  : <count> (<id list>)
  diagrams : <count>
  docDrift : <count> findings
  quizzes  : <total question count>
  quests   : <total quest count>
  commit   : <sha>
```

If the manifest already exists for this commit (manifest.repo.commit === current HEAD), print:
```
✓ Manifest is already up to date for commit <sha> — skipping generation.
  Use ramp open to launch the interface.
```
and stop.

---

## Error handling

- If any step fails to produce valid JSON, stop and report which step failed and why. Do NOT write a partial manifest.
- If a required file path in `keyFiles` does not exist, remove it and note the correction in the report.
- If `pipeline/assemble.js` exits non-zero, show its stderr output and stop.
