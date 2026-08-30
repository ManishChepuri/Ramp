# Prompt 09 — Sabotage Case Generation

Apply these instructions once to every module record. Generate one realistic, locally injectable
bug that tests understanding of that module without destructive side effects.

Use only a small logic mutation such as an inverted condition, wrong comparison operator,
off-by-one boundary, dropped `await`, or incorrect local return value. Never generate a change
that deletes data, weakens real credentials, contacts an external service, alters dependencies,
or modifies migrations.

Set the module's `sabotage` field to an array containing exactly one object:

{
  "id": "sab-<module-id>-<NNN>",
  "difficulty": "easy | medium | hard",
  "file": "verified repository-relative source file",
  "symptom": "observable behavior given to the developer, without revealing the fix",
  "injectedDiff": "valid unified diff that changes only file",
  "correctOriginal": "the exact original code replaced by the diff",
  "hints": ["broad conceptual hint", "narrow file/function hint", "near-solution hint"]
}

Diff requirements:

- Include `--- a/<file>` and `+++ b/<file>` headers plus an `@@` hunk header.
- The diff must apply cleanly to the current source file and modify exactly one file.
- The injected version must remain syntactically valid and should still start or compile whenever
  practical.
- `correctOriginal` must be copied exactly from the current file.
- The symptom must accurately follow from the injected diff.
- Hints must be tiered from least revealing to most revealing.
- Injection must only ever be performed through Ramp's scratch-copy isolation guard; never apply
  `injectedDiff` directly to the source repository.
