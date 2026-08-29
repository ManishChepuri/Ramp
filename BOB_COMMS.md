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

_Newest entries at the top. Nothing has been posted yet — Dev 1 posts first when the fixture is committed._

---
