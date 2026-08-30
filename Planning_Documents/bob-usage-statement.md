# Ramp — Bob Usage Statement

IBM Bob was used as the core engine of Ramp, not as a coding assistant. The following maps each Bob capability to where it appears in the product.

## Bob IDE — Agent mode (Module A1)

Bob's Agent mode autonomously explores the target repository without step-by-step prompting. It identifies the repo's purpose, tech stack, entry points, and build instructions, writing structured output to the manifest. No human directs which files to read — Bob discovers the codebase independently.

## Bob IDE — Parallel subagents (Module A2)

Three to five subagents run concurrently, each scoped to a distinct codebase domain (API layer, data layer, authentication, tests, infrastructure) in an isolated context. Each subagent produces a structured module record containing name, purpose, key files, dependencies, complexity rating, and risk rating. The parallelism compresses generation time and is visible in the terminal when `ramp generate` runs.

## Bob IDE — Document understanding (Module A4)

Bob ingests the target repository's existing README and documentation files and compares their claims against the actual code, producing a list of drift findings — each with the specific claim in the docs, the contradicting code location, and a severity rating. These findings become the developer's first quests in Ramp.

## Bob IDE — Diagram generation (Module A3)

Bob generates Mermaid architecture and sequence diagrams directly from its code analysis. These are embedded in the manifest and rendered inline in the Ramp web interface without leaving the app.

## Bob IDE — Quiz and rubric generation (Modules B1, FR-1.11)

Bob generates three to five multiple-choice quiz questions per module, each with four options, one correct answer, and a written explanation. It also generates an explain-back prompt and a reference rubric for each module — a list of key concepts a correct explanation must cover, with weights and required keywords. This rubric is what watsonx.ai grades against at runtime.

## Bob IDE — Starter task mining (Module A7)

Bob mines the codebase for TODOs, low-complexity functions, and low-blast-radius files, producing a ranked list of candidate first tasks with difficulty ratings. These become the quests on the Ramp quest board.

## Bob IDE — Code generation for drift corrections (Module F2)

When a developer confirms a documentation drift finding, Bob generates the corrected documentation text and a diff suitable for a pull request. The developer reviews and edits before staging — nothing lands unreviewed.

## Bob IDE — Skills (Module E1)

The entire generation pipeline is packaged as a reusable Bob skill (`ramp-generate`). Running the skill against a different repository produces a fresh curriculum with no code changes — this is what makes Ramp a portable developer tool rather than a one-off document.

## Bob Shell — Non-interactive invocation (Module K1, K2)

`ramp generate` invokes Bob Shell non-interactively from the command line, making Bob a runtime component of the product rather than only a build-time tool. The terminal shows Bob's subagent activity as it runs, providing visible proof that Bob is doing the work.

## Custom rules — strict JSON output contract (FR-1.9)

Custom Bob rules enforce that all subagent output conforms to the `ramp-manifest.json` schema. This prevents prose responses from breaking downstream parsing and is the mechanism that makes the manifest machine-readable.

## IBM watsonx.ai — Runtime grading (Module H)

Because Bob runs in the IDE and cannot be called by a deployed application, watsonx.ai fills the runtime inference gap. The `ibm/granite-4-h-small` model receives the developer's explanation alongside Bob's pre-authored rubric and returns a structured JSON assessment: score, covered concepts, missed concepts, misconceptions, and feedback. The same grading path handles both written and spoken (transcribed) submissions.

## IBM Cloudant — Persistence (Module I)

IBM Cloudant stores the generated manifests (keyed by repository and commit), user progress documents (XP, certifications, badges, quest state, quiz history), and the contribution ledger. Because Cloudant is a JSON document store, the manifest Bob emits is stored in the same shape it is generated — no schema translation.

## IBM Speech-to-Text — Spoken explain-back (Module J)

IBM Speech-to-Text transcribes the developer's spoken explanation of a module. The transcript is reviewed and corrected before submission, then graded through the identical watsonx.ai path used for written submissions.
