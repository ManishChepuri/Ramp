# Ramp — Backend API Contract

**Agreed in Phase 0. Do not change unilaterally — any change breaks Dev 2 and Dev 3 simultaneously.**

This document defines the four endpoints the thin backend exposes. Dev 2 calls them from the frontend. Dev 3 implements them. Dev 1 does not touch this layer.

All requests and responses use `Content-Type: application/json` unless noted.
All credentials (watsonx API key, Cloudant credentials) are held server-side only and never returned to the browser.

---

## POST /grade

**Purpose:** Grade a developer's free-text (or transcribed spoken) explanation of a module against Bob's rubric. Calls watsonx.ai internally.

**Called by:** Dev 2, from the explain-back screen, when the developer submits their explanation.

### Request body

```json
{
  "moduleId": "auth",
  "explanation": "The login route receives email and password, looks up the user, compares the password hash using bcrypt, and returns a JWT on success.",
  "rubric": [
    { "concept": "Request arrives at POST /login in src/routes/auth.js", "weight": 1, "mustMention": ["route", "auth.js", "login"] },
    { "concept": "The submitted password is compared against the stored bcrypt hash", "weight": 2, "mustMention": ["bcrypt", "hash", "compare"] },
    { "concept": "A JWT is signed and returned in the response on success", "weight": 2, "mustMention": ["JWT", "token", "sign"] }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `moduleId` | string | ID of the module being explained. Used for logging. |
| `explanation` | string | The developer's free-text explanation (typed or transcribed). |
| `rubric` | array | Copied directly from `module.explainBack.rubric` in the manifest. Dev 2 passes this through — Dev 3 forwards it to watsonx.ai. |

### Response body (success — 200)

```json
{
  "score": 72,
  "covered": [
    "Request arrives at POST /login in src/routes/auth.js",
    "The submitted password is compared against the stored bcrypt hash"
  ],
  "missed": [
    "A JWT is signed and returned in the response on success"
  ],
  "misconceptions": [],
  "feedback": "Good explanation of the password check. You did not mention that a JWT is signed and returned — that is the key output of a successful login."
}
```

| Field | Type | Description |
|---|---|---|
| `score` | number | 0–100. Percentage of rubric weight covered. |
| `covered` | string[] | Rubric concepts the explanation addressed. |
| `missed` | string[] | Rubric concepts that were absent. |
| `misconceptions` | string[] | Statements that directly contradict the rubric. Empty array if none. |
| `feedback` | string | Human-readable summary for the developer. |

### Response body (degraded — 200, watsonx unavailable)

```json
{
  "score": null,
  "covered": [],
  "missed": [],
  "misconceptions": [],
  "feedback": "Grading service unavailable. Please complete the multiple-choice quiz to certify on this module.",
  "degraded": true
}
```

Dev 2 checks for `degraded: true` and routes the user to the MCQ path instead.

---

## POST /transcribe

**Purpose:** Transcribe a voice recording of the developer's spoken explain-back. Returns editable text that Dev 2 pre-fills into the explain-back input before the developer submits to `/grade`.

**Called by:** Dev 2, from the voice recording screen, after the developer stops recording.

### Request

`Content-Type: multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `audio` | file | Raw audio blob captured from the browser microphone. WAV or WebM. |

### Response body (success — 200)

```json
{
  "transcript": "The login route receives an email and password. It looks up the user in the database, compares the password using bcrypt, and if it matches it signs a JWT and returns it."
}
```

| Field | Type | Description |
|---|---|---|
| `transcript` | string | The transcribed text. Dev 2 pre-fills this into the explain-back textarea so the developer can review and correct it before submitting to /grade. |

### Response body (failure — 200)

```json
{
  "transcript": "",
  "error": "Transcription failed. Please type your explanation instead."
}
```

Dev 2 shows the error message and falls back to the empty text input. Never show a 500 to the user for this.

---

## GET /progress/:userId

**Purpose:** Load a developer's current progress — XP, level, certifications, quest completions, badges. Called on app load and after any state-changing action.

**Called by:** Dev 2, on dashboard load and after completing a quiz, quest, or explain-back.

### URL parameter

| Parameter | Description |
|---|---|
| `userId` | A string identifier for the developer. For the hackathon, use a simple name or UUID stored in localStorage. No auth required. |

### Response body (success — 200)

```json
{
  "userId": "manish-dev",
  "repoId": "shopwave-api@a3f92c1",
  "xp": 145,
  "level": "Resident",
  "certifications": ["auth", "catalog"],
  "badges": ["first-light", "cartographer", "first-blood"],
  "quests": {
    "q-auth-001": "completed",
    "q-auth-002": "available",
    "q-orders-001": "locked",
    "q-catalog-001": "completed",
    "q-catalog-002": "available"
  },
  "quizHistory": {
    "auth": { "attempts": 2, "bestScore": 100, "certified": true },
    "catalog": { "attempts": 1, "bestScore": 100, "certified": true },
    "orders": { "attempts": 0, "bestScore": null, "certified": false }
  },
  "explainBackHistory": {
    "auth": { "attempts": 1, "bestScore": 72, "passed": false }
  },
  "contributionLedger": [
    { "type": "doc-fix", "questId": "q-auth-002", "completedAt": "2025-08-28T11:30:00Z" }
  ],
  "startedAt": "2025-08-28T10:15:00Z",
  "lastActiveAt": "2025-08-28T11:45:00Z"
}
```

### Response body (new user — 200)

If no progress document exists for this userId + repoId, return a zeroed-out starting state rather than a 404. Dev 2 should never have to handle a missing user specially.

```json
{
  "userId": "new-developer",
  "repoId": "shopwave-api@a3f92c1",
  "xp": 0,
  "level": "Visitor",
  "certifications": [],
  "badges": [],
  "quests": {},
  "quizHistory": {},
  "explainBackHistory": {},
  "contributionLedger": [],
  "startedAt": null,
  "lastActiveAt": null
}
```

---

## POST /progress/:userId

**Purpose:** Write an updated progress state back to Cloudant after any action the developer takes.

**Called by:** Dev 2, after every state-changing event: completing a quiz, earning a badge, finishing a quest, passing an explain-back.

### URL parameter

Same as GET — the developer's userId string.

### Request body

The full progress object, in the same shape as the GET response. Dev 2 holds the current state in memory, mutates it locally on each action, then POSTs the whole object back.

```json
{
  "userId": "manish-dev",
  "repoId": "shopwave-api@a3f92c1",
  "xp": 155,
  "level": "Resident",
  "certifications": ["auth", "catalog"],
  "badges": ["first-light", "cartographer", "first-blood", "in-your-own-words"],
  "quests": {
    "q-auth-001": "completed",
    "q-auth-002": "available",
    "q-orders-001": "locked",
    "q-catalog-001": "completed",
    "q-catalog-002": "available"
  },
  "quizHistory": {
    "auth": { "attempts": 2, "bestScore": 100, "certified": true },
    "catalog": { "attempts": 1, "bestScore": 100, "certified": true },
    "orders": { "attempts": 0, "bestScore": null, "certified": false }
  },
  "explainBackHistory": {
    "auth": { "attempts": 2, "bestScore": 85, "passed": true }
  },
  "contributionLedger": [
    { "type": "doc-fix", "questId": "q-auth-002", "completedAt": "2025-08-28T11:30:00Z" }
  ],
  "startedAt": "2025-08-28T10:15:00Z",
  "lastActiveAt": "2025-08-28T12:00:00Z"
}
```

### Response body (success — 200)

```json
{ "ok": true }
```

### Response body (failure — 500)

```json
{ "ok": false, "error": "Failed to persist progress. Your session data is safe locally." }
```

Dev 2 should not block the user on a failed write — local state is still correct. Show a non-blocking toast if needed.

---

## Level thresholds (Dev 2 computes this client-side, Dev 3 does not need to know it)

| Level | XP required |
|---|---|
| Visitor | 0 |
| Tourist | 50 |
| Resident | 100 |
| Local | 200 |
| Maintainer | 400 |

---

## Quest state values

| Value | Meaning |
|---|---|
| `locked` | Prerequisite module not yet certified |
| `available` | Module certified, quest not started |
| `completed` | Quest finished and counted in ledger |
