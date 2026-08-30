# Ramp Manifest Generation

You are generating a Ramp onboarding manifest for the Git repository that is open as your
workspace. Work read-only: do not create, edit, rename, or delete any workspace file. You may
use read/search tools and read-only Git commands. Do not install dependencies or run the
application.

Inspect the repository without assuming a framework-specific directory structure:

1. Read the root README, dependency manifests, build configuration, and application entry points.
2. Identify 3–5 natural code domains. Use parallel subagents when available, with one domain per
   subagent. Every file path in the result must be verified to exist.
3. Produce an architecture diagram and a sequence diagram using valid Mermaid.
4. Compare factual documentation claims with source code and report only genuine contradictions.
5. For every module, generate module-specific quizzes, an explain-back rubric, at least one safe
   starter quest, and exactly one realistic sabotage case.
6. For every drift finding, generate a corrected replacement and a unified diff that applies to
   the documentation file.

Return exactly one JSON object with no prose and no Markdown fence:

{
  "version": "1.0",
  "repo": {
    "name": "repository directory name",
    "commit": "short current Git SHA",
    "generatedAt": "ISO 8601 timestamp"
  },
  "overview": {
    "purpose": "one sentence",
    "techStack": ["technology"],
    "entryPoints": ["verified relative file path"],
    "setupSteps": ["ordered setup step"]
  },
  "modules": [
    {
      "id": "kebab-case",
      "name": "human-readable name",
      "summary": "2–4 code-specific sentences",
      "keyFiles": ["verified relative file path"],
      "dependencies": ["another module id"],
      "complexity": "low | medium | high",
      "riskLevel": "low | medium | high",
      "prerequisites": ["another module id"],
      "quiz": [
        {
          "question": "code-specific question",
          "options": ["option 1", "option 2", "option 3", "option 4"],
          "correctIndex": 0,
          "explanation": "why the answer is correct"
        }
      ],
      "explainBack": {
        "prompt": "trace or explain a concrete flow",
        "rubric": [
          {
            "concept": "required concept",
            "weight": 1,
            "mustMention": ["keyword 1", "keyword 2"]
          }
        ]
      },
      "sabotage": [],
      "quests": [
        {
          "id": "q-<module>-<NNN>",
          "title": "short title",
          "type": "starter | doc-fix",
          "difficulty": "easy | medium | hard",
          "xp": 10,
          "files": ["verified relative file path"],
          "rationale": "why this is safe for a newcomer"
        }
      ]
    }
  ],
  "diagrams": [
    {
      "type": "architecture | sequence",
      "title": "short title",
      "mermaid": "valid Mermaid source"
    }
  ],
  "docDrift": []
}

Hard constraints:

- Include 3–5 modules when the repository has enough distinct domains.
- Each module needs at least 3 quiz questions, exactly 4 options per question, and a correctIndex
  from 0–3.
- Each explainBack rubric needs 4–6 items. Each weight is 1 or 2 and each mustMention contains
  2–4 strings.
- Each module needs exactly one sabotage entry matching the appended sabotage contract.
- Each module needs at least one quest. XP is exactly easy=10, medium=25, or hard=50.
- Quest type is only starter or doc-fix.
- Include exactly two diagrams when the repository has an identifiable request or execution flow:
  one architecture and one sequence diagram.
- If no genuine documentation drift exists, return an empty docDrift array. Never invent drift.
- Use only repository-relative paths that you confirmed are regular files.
- Do not add fields outside this contract.
- The raw final response must pass JSON.parse().
