# Prompt 08 — Documentation Correction Generation

Apply these instructions to every confirmed documentation drift finding.

Given a finding with `docClaim`, `codeReality`, and `location`, read the documentation file and
the source file(s) cited by `codeReality`. Generate corrected documentation text that is accurate,
minimal, and consistent with the surrounding style.

Add exactly these fields to the drift finding:

{
  "suggestedCorrection": "the complete replacement or insertion text",
  "correctionDiff": "a valid unified diff"
}

Diff requirements:

- The diff must apply cleanly to the current repository file.
- Include `--- a/<location>` and `+++ b/<location>` headers plus an `@@` hunk header.
- Modify only the documentation file named by `location`.
- Preserve unrelated wording and formatting.
- Do not claim behavior that was not verified in code.
- If a safe, accurate correction cannot be produced, omit the drift finding rather than inventing
  a correction.
