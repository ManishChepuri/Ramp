# Ramp — Dev 2 Frontend & Experience Plan

**Owner:** Gaurinath Subash (Dev 2)
**Stack:** React + JavaScript + Vite + Tailwind CSS
**Data source:** `fixtures/sample-manifest.json` (built first; real manifest swaps in at Sync 2)
**Backend contract:** Four endpoints — `/api/grade`, `/api/transcribe`, `/api/progress` (GET/POST). All served from Dev 3's thin server.
**Priority:** P0 → P1 → P2. Never cut Track 2D (polish).

---

## Visual Direction

**IBM Carbon Design System + Developer-tool dark aesthetic.**

The UI speaks two languages at once: IBM's enterprise credibility (Carbon tokens, IBM Plex fonts, the specific IBM blue family) and a developer-tool feel (dark backgrounds, monospace accents, terminal-style progress indicators). Think VS Code's sidebar meets a Carbon dashboard — not a consumer app, not a corporate intranet.

### Color Tokens (IBM Carbon v11 — Gray 100 theme as base)

| Token | Hex | Usage |
|---|---|---|
| `background` | `#161616` | Page background |
| `layer-01` | `#262626` | Cards, panels |
| `layer-02` | `#393939` | Nested cards, inputs |
| `border-subtle` | `#525252` | Card borders, dividers |
| `text-primary` | `#f4f4f4` | Headings, body copy |
| `text-secondary` | `#c6c6c6` | Subtext, captions |
| `text-placeholder` | `#6f6f6f` | Empty states |
| `interactive` | `#4589ff` | IBM Blue 50 — primary CTAs, active states |
| `interactive-hover` | `#0f62fe` | IBM Blue 60 — hover on interactive |
| `focus` | `#4589ff` | Focus rings |
| `brand-core` | `#0f62fe` | IBM Blue 60 — the one true brand blue |
| `support-success` | `#24a148` | Certification pass, correct answers |
| `support-warning` | `#f1c21b` | Medium risk, caution states |
| `support-error` | `#da1e28` | High risk, failed attempts |
| `support-info` | `#4589ff` | Info badges, neutral highlights |
| `xp-gold` | `#f1c21b` | XP values, level indicators |
| `quest-accent` | `#08bdba` | Teal — quest board, starter tasks (IBM Teal 40) |
| `drift-accent` | `#ff832b` | Doc drift findings (IBM Orange 40) |
| `sabotage-accent` | `#ee5396` | Sabotage mode (IBM Magenta 40) |

### Typography

- **Font family:** IBM Plex Sans (primary), IBM Plex Mono (code, file paths, terminal output)
- **Scale:** 12 / 14 / 16 / 20 / 24 / 32 / 42px
- **Weights:** 400 (body), 500 (label/caption), 600 (subheading), 700 (heading)
- **Mono uses:** module IDs, file paths, XP numbers, timer, terminal progress lines

### Spatial Language

- Base unit: `4px`. Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px
- Cards: `rounded-lg` (8px radius), `border border-[#525252]`, `bg-[#262626]`
- Tight information density — this is a tool, not a landing page. Padding 16–24px per card.
- Subtle depth: one-level elevation only via `bg-[#262626]` on `bg-[#161616]`

### Motion

- Transitions: `150ms ease-out` for hover states, `200ms ease-in-out` for panel slides
- XP gain: number count-up animation, brief `scale-110` pulse on badge award
- No gratuitous animation — every motion communicates state change

---

## Figma AI Prompt

Use this prompt verbatim in Figma AI (Make Designs or similar):

---

> **Design a complete multi-screen web application called "Ramp" — a developer onboarding certification tool. The visual style is IBM Carbon Design System dark theme (Gray 100 base) combined with a developer-tool aesthetic similar to VS Code's dark UI. Use IBM Plex Sans as the primary typeface and IBM Plex Mono for code, file paths, XP numbers, and terminal output.**
>
> **Color palette:**
> - Page background: `#161616`
> - Card/panel surface: `#262626`
> - Nested inputs/layer: `#393939`
> - Borders: `#525252`
> - Primary text: `#f4f4f4`
> - Secondary text: `#c6c6c6`
> - IBM Blue (primary CTA, interactive): `#0f62fe`
> - IBM Blue (hover, active): `#4589ff`
> - Success green: `#24a148`
> - Warning yellow / XP gold: `#f1c21b`
> - Error red: `#da1e28`
> - Quest teal accent: `#08bdba`
> - Doc drift orange accent: `#ff832b`
>
> **Design these 7 screens at 1440px wide desktop, with a persistent left sidebar (240px wide) containing: the Ramp wordmark in IBM Plex Sans Bold, a vertical nav list (Dashboard, Modules, Quest Board, Doc Drift, Impact, Settings), and a user XP/level widget at the bottom showing level name, XP bar, and current XP in IBM Plex Mono.**
>
> **Screen 1 — Dashboard:**
> A hero section at the top showing overall ramp-up progress as a thick horizontal progress bar (IBM Blue fill on `#393939` track), percentage complete in large IBM Plex Mono, and the repository name. Below: a 3-column stat row showing "Modules Certified", "Quests Completed", and "Doc Fixes Shipped" as bold number + label cards. Below that: a "Next Recommended Action" card with a teal left-border accent, an action title, and a CTA button in IBM Blue. Below: a horizontal row of earned badges — circular icons with a gold ring on earned ones, greyed-out lock icon on unearned ones, each with a short name underneath in 12px IBM Plex Sans.
>
> **Screen 2 — Module List:**
> A full-width list of module cards. Each card (`#262626` background, `#525252` border) shows: module name in 20px semibold, a one-line summary in secondary text, a risk badge (pill: red for high, yellow for medium, green for low), a complexity badge (pill: same color logic), a certification status indicator (IBM Blue "Certified" chip or grey "In Progress" or locked padlock icon), and a row of quick-action buttons (Take Quiz, Explain Back, View Diagrams). Cards for locked modules are visually dimmed with a padlock overlay. Show 4 modules visible.
>
> **Screen 3 — Module Detail / Quiz Screen:**
> Left column (60%): the module name as a large heading, a paragraph summary, then a Mermaid architecture diagram rendered as a dark-background SVG box with a "View Diagram" label and a subtle code-block border. Below the diagram: a collapsible "Key Files" section listing file paths in IBM Plex Mono on a `#393939` row. Right column (40%): a quiz card with "Question 2 of 4" progress indicator (dot row), the question text in 18px, four answer option buttons (full-width, `#393939` background, `#525252` border, IBM Blue left-border on selected, green fill on correct reveal, red fill on incorrect reveal), and a "Check Answer" CTA button. Below the answer reveal: the explanation text in `#c6c6c6`.
>
> **Screen 4 — Explain-Back Screen:**
> A full-width centered layout. At the top: the module name and an explain-back prompt in 20px — e.g. "In your own words, describe how a request flows through the API layer." Below: a large dark textarea (`#262626`, `#525252` border, IBM Plex Sans 16px, 200px tall) with placeholder text "Type your explanation here…". To the right of the textarea: a microphone button (circular, `#0f62fe` background, white mic icon, 56px) with label "Speak Instead" in 12px below. Below the textarea: a "Submit Explanation" button in IBM Blue. Below the button (post-submission state): a gap analysis results card — a heading "Your Explanation — Gap Analysis", then two columns: "Concepts Covered" (green check icons + concept names) and "Concepts Missed" (red X icons + concept names), then a "Misconceptions Identified" section in amber, then a final comprehension score (large number, e.g. "72 / 100") in IBM Plex Mono, then a feedback paragraph in secondary text.
>
> **Screen 5 — Quest Board:**
> A kanban-style board with three columns: "Available", "In Progress", "Completed". Each quest card (`#262626`, `#525252` border, teal left-border accent for doc-fix quests, blue left-border for starter tasks) shows: quest title in 16px semibold, a difficulty badge (easy in green, medium in yellow, hard in red), an XP reward in IBM Plex Mono gold (`#f1c21b`) — e.g. "+25 XP", the affected file path(s) in IBM Plex Mono 12px secondary, and a one-line rationale. Locked quests show the card dimmed with a "Certify [Module Name] first" prerequisite label.
>
> **Screen 6 — Doc Drift Findings:**
> A list layout. A top summary bar showing "X findings detected — Y confirmed, Z dismissed" in secondary text. Each finding card (`#262626`, orange left-border accent) shows: a severity badge (high/medium/low), the documentation claim in italic secondary text, the code reality contradiction in primary text with an arrow separator (→), the file location in IBM Plex Mono, and two action buttons: "Confirm Finding" (IBM Blue) and "Dismiss" (ghost/outline). Confirmed findings expand to show Bob's drafted correction in a diff-style view (red line for removed text, green line for added text, both on dark `#393939` backgrounds), an editable textarea for the dev to adjust the correction, and a "Stage Correction" CTA.
>
> **Screen 7 — Impact View:**
> A metrics dashboard. Top row: three large KPI cards — "Time to First Certification" (e.g. "42 min" in large IBM Plex Mono), "Comprehension Score" (e.g. "78 / 100"), "Doc Fixes Shipped" (e.g. "3"). Below: a side-by-side comparison table — "Manual Onboarding" vs "With Ramp" — showing time, correctness, and effort rows with the Ramp column highlighted in IBM Blue. Below: a module-by-module certification progress chart (horizontal bar chart, IBM Blue fill, bars for each module showing % quiz score). Below: a contribution ledger — a timeline list of improvements the user shipped, each row showing date, quest title, type badge, and XP earned.
>
> **Global design rules:**
> - No white backgrounds anywhere — the entire app lives in the dark theme
> - IBM Blue (`#0f62fe`) is the only true accent color for interactive elements; teal, orange, and gold are status/category accents only
> - Use 1px borders at `#525252` on all cards, never box-shadows
> - Buttons: primary = IBM Blue fill, white text; secondary = transparent fill, `#4589ff` border and text; destructive = `#da1e28`
> - All icons from Carbon Icons (or similar outlined icon set) — 20px default, 16px inline
> - Sidebar nav active state: IBM Blue left-border (3px), `#262626` row background, `#f4f4f4` text
> - Sidebar nav inactive: transparent background, `#c6c6c6` text, hover = `#393939` background
> - Include a top header bar (48px tall, `#262626` background, `#525252` bottom border) showing the current page title left-aligned and a repository selector dropdown right-aligned

---

## Screens to Build (code)

| Screen | Route | Priority | Tracks |
|---|---|---|---|
| Dashboard | `/` | P0 | 2A |
| Module List | `/modules` | P0 | 2A |
| Module Detail + Quiz | `/modules/:id` | P0 | 2A |
| Explain-Back | `/modules/:id/explain` | P1 | 2B |
| Quest Board | `/quests` | P0 | 2A |
| Doc Drift Findings | `/drift` | P1 | 2B |
| Impact View | `/impact` | P1 | 2B |
| Voice Explain-Back (mic UI) | `/modules/:id/explain` (tab) | P2 | 2C |
| Sabotage Challenge | `/modules/:id/sabotage` | P2 | 2C |

---

## Sub-Tasks

---

### ST-1 — Project Scaffold & Design Tokens

**Status:** `[ ] pending`

**Intent:** Stand up the Vite + React + Tailwind project, import IBM Plex fonts, define all Carbon color tokens as Tailwind config extensions, and create the shell layout (sidebar + header + main content area) that every screen will live inside.

**Expected Outcomes:**
- `npm run dev` starts the app and shows the shell layout
- IBM Plex Sans and IBM Plex Mono load correctly
- All Carbon color tokens are usable as Tailwind classes (`bg-carbon-layer-01`, `text-carbon-interactive`, etc.)
- Sidebar navigation renders with correct active/inactive states
- Header bar renders with page title and a placeholder repo selector
- Routing skeleton is wired (React Router, one route per screen, all showing placeholder content)
- `fixtures/sample-manifest.json` is committed and loadable

**Todo List:**
1. Scaffold with `npm create vite@latest ramp-frontend -- --template react`
2. Install Tailwind CSS v3, PostCSS, Autoprefixer per Vite+Tailwind docs
3. Install React Router v6, `mermaid`, `@ibm/plex` (or Google Fonts import for IBM Plex Sans + Mono)
4. Extend `tailwind.config.js` with all Carbon color tokens from the Visual Direction table above, the spacing scale, and font families
5. Create `src/layouts/AppShell.jsx` — sidebar (240px) + header (48px) + main content slot
6. Create `src/components/Sidebar.jsx` — wordmark, nav links, XP widget stub
7. Create `src/components/Header.jsx` — page title prop, repo selector stub
8. Wire React Router in `src/main.jsx` with routes for all 9 screens (placeholder components)
9. Create `fixtures/sample-manifest.json` matching the full schema (3 modules, 2 quizzes each, 1 rubric each, 3 quests, 2 drift findings, 2 diagrams, 1 sabotage case)
10. Create `src/hooks/useManifest.js` — loads the fixture JSON, exposes it via context

**Relevant Context:**
- Schema defined in `ramp-feature-map-and-requirements.md` §5
- Color tokens in Visual Direction table above
- Sidebar nav items: Dashboard, Modules, Quest Board, Doc Drift, Impact (Settings optional)
- XP levels: Visitor (0–99) → Tourist (100–249) → Resident (250–499) → Local (500–999) → Maintainer (1000+)

---

### ST-2 — Dashboard Screen

**Status:** `[ ] pending`

**Intent:** Build the home screen that gives the developer a single-glance view of their ramp-up state and always shows one clear next action. This is the first thing judges see — it must be polished.

**Expected Outcomes:**
- Overall progress bar renders from manifest + simulated progress state
- Three stat cards (Modules Certified, Quests Completed, Doc Fixes Shipped) show correct counts
- "Next Recommended Action" card shows a computed recommendation with a working navigation CTA
- Badge row renders all badges from manifest — earned ones gold-ringed, unearned ones locked/dimmed
- All data is live from `useManifest` hook and a local `useProgress` state

**Todo List:**
1. Create `src/pages/Dashboard.jsx`
2. Build `src/components/ProgressBar.jsx` — thick bar, percentage label in Mono, animated fill
3. Build `src/components/StatCard.jsx` — large Mono number, label, optional trend indicator
4. Build `src/components/NextAction.jsx` — teal left-border card, action text, CTA button that navigates
5. Build `src/components/BadgeRow.jsx` — horizontal scroll, `src/components/Badge.jsx` (earned/locked states)
6. Implement `useProgress` hook (local state for now: XP, certifications array, quests completed, doc fixes shipped)
7. Compute next recommended action: if any module has no quiz attempts → "Start Quiz: [Module]"; if quiz passed but no explain-back → "Explain Back: [Module]"; if explain-back done → "View Quests"
8. Wire the dashboard to render all of the above using manifest data + progress state

**Relevant Context:**
- FR-2.1: dashboard shows overall progress, current level, XP, single next recommended action
- Badge definitions in manifest `badges[]` array
- Progress state is local until Sync 3 (Dev 3 wires Cloudant persistence)

---

### ST-3 — Module List Screen

**Status:** `[ ] pending`

**Intent:** Show all modules as scannable cards so the developer can understand the codebase structure at a glance and navigate to any module. Locked modules must be visually distinct.

**Expected Outcomes:**
- All modules from the manifest render as cards
- Risk and complexity badges render with correct color semantics
- Certification status chip renders correctly per module
- Locked modules are dimmed with prerequisite label shown
- Quick-action buttons (Take Quiz, Explain Back, View Diagrams) navigate correctly
- Clicking a card navigates to the Module Detail screen

**Todo List:**
1. Create `src/pages/ModuleList.jsx`
2. Build `src/components/ModuleCard.jsx` — all fields, badge pills, action buttons, locked overlay
3. Build `src/components/RiskBadge.jsx` and `src/components/ComplexityBadge.jsx` — pill shape, color by value
4. Build `src/components/CertificationChip.jsx` — three states: Certified (blue), In Progress (grey), Locked (padlock)
5. Implement lock logic: a module is locked if any of its `prerequisites[]` are not in the certified list
6. Render the module list sorted by prerequisite order (overview first, then dependent modules)

**Relevant Context:**
- FR-2.2: module card fields — summary, risk level, certification status, available quests
- FR-2.6: locked quests / locked modules show prerequisite
- `module.prerequisites[]` array drives lock logic
- `module.riskLevel` values: "high" | "medium" | "low"
- `module.complexity` values: "high" | "medium" | "low"

---

### ST-4 — Module Detail & Quiz Screen

**Status:** `[ ] pending`

**Intent:** The core learning interaction. The developer reads the module summary, views architecture diagrams, examines key files, then takes the quiz. This screen is the P0 certification path.

**Expected Outcomes:**
- Module summary, key files list, and dependencies render correctly
- Mermaid diagram renders inline inside a dark code-block styled container
- Quiz renders one question at a time with a dot-row progress indicator
- Selecting an answer highlights the choice; "Check Answer" reveals correct/incorrect with explanation
- "Next Question" advances; final question shows a score summary
- Score ≥ 80% awards certification and triggers a visual celebration (brief animation)
- Score < 80% shows retry option

**Todo List:**
1. Create `src/pages/ModuleDetail.jsx` — two-column layout (summary left, quiz right)
2. Build `src/components/MermaidDiagram.jsx` — uses `mermaid.render()`, dark theme config, loading state
3. Build `src/components/KeyFilesList.jsx` — monospace file paths, collapsible
4. Build `src/components/QuizCard.jsx` — question text, four AnswerOption buttons, Check Answer CTA
5. Build `src/components/AnswerOption.jsx` — default / selected / correct / incorrect states
6. Build `src/components/QuizProgress.jsx` — dot row indicator
7. Build `src/components/QuizResult.jsx` — score display, certified/retry message, XP awarded
8. Implement quiz state machine in `src/hooks/useQuiz.js`: `idle → answering → revealed → next → complete`
9. On completion ≥ 80%: call `useProgress` to mark module certified, award XP, check badge criteria
10. Wire navigation: "View Diagrams" tab, "Explain Back" button navigates to Explain-Back screen

**Relevant Context:**
- FR-2.3: Mermaid diagrams inline, no leaving the app
- FR-2.4: one question at a time, score on completion, explanation per answer
- FR-2.5: 80% pass threshold, configurable
- Module's `quiz[]` array: `{ question, options[4], correctIndex, explanation }`
- Mermaid v10 requires `mermaid.initialize({ theme: 'dark' })` before `mermaid.render()`

---

### ST-5 — Quest Board Screen

**Status:** `[ ] pending`

**Intent:** Render the developer's available first tasks as quests in a kanban-style board. This is the "onboarding pays rent" entry point — doc-fix quests must be visually distinct from starter-task quests.

**Expected Outcomes:**
- Three columns render: Available, In Progress, Completed
- Quest cards show title, difficulty badge, XP reward (gold Mono), file paths, rationale
- Doc-fix quests have teal left-border; starter-task quests have blue left-border
- Locked quests are dimmed with prerequisite label
- "Start Quest" moves a card to In Progress; "Mark Complete" moves to Completed and awards XP
- XP gain triggers the XP animation in the sidebar widget

**Todo List:**
1. Create `src/pages/QuestBoard.jsx` — three-column kanban layout
2. Build `src/components/KanbanColumn.jsx` — column title, quest card list, empty state
3. Build `src/components/QuestCard.jsx` — all fields, type-based border color, difficulty badge, XP chip, locked overlay
4. Build `src/components/XpChip.jsx` — gold Mono text "+N XP", small pill
5. Implement quest state in `useProgress`: each quest has status `available | in-progress | complete`
6. Gather quests from all modules' `quests[]` arrays; doc-drift quests also pulled from `docDrift[]` items that are confirmed
7. Lock logic: quest belongs to a module that is not certified → locked
8. Completing a quest: award XP, check badge criteria (e.g. "Rent Paid" badge for first doc fix)

**Relevant Context:**
- FR-2.6: quests locked until module certified
- C1: XP mapping — easy 10 / medium 25 / hard 50
- F1: drift-to-quest conversion — confirmed drift findings become assignable quests
- Quest type field: `"starter" | "doc-fix"`

---

### ST-6 — Explain-Back Screen (P1)

**Status:** `[ ] pending`

**Intent:** The primary differentiator interaction. The developer writes (or speaks) a free-text explanation of a module and receives an itemized gap analysis from watsonx.ai. This is what makes Ramp a certification tool, not just a quiz tool.

**Expected Outcomes:**
- Explain-back prompt renders from `module.explainBack.prompt`
- Textarea accepts free-text input
- "Submit Explanation" POST to `/api/grade` with explanation + module rubric
- Loading state renders during the API call
- Gap analysis result renders: covered concepts (green checks), missed concepts (red X), misconceptions (amber), score, feedback paragraph
- Score fed into certification state — explain-back can certify a module in lieu of quiz (or supplement it)
- Microphone button renders (P2 voice path behind a feature flag / separate tab)
- Written fallback always available (FR-5.5)

**Todo List:**
1. Create `src/pages/ExplainBack.jsx`
2. Build `src/components/ExplainPrompt.jsx` — prompt text, module context
3. Build `src/components/ExplainTextarea.jsx` — dark styled textarea, character count, placeholder
4. Build `src/components/MicButton.jsx` — circular IBM Blue button, recording state (pulsing ring), P2 placeholder for now
5. Build `src/components/GapAnalysis.jsx` — two-column covered/missed lists, misconceptions section, score display
6. Build `src/components/ConceptTag.jsx` — green check variant and red X variant
7. Implement `src/hooks/useExplainBack.js` — manages submission state: `idle → submitting → result → error`
8. Wire POST to `/api/grade`; handle loading, success, and error states
9. On successful grade: if score ≥ 80%, optionally certify module; award "In Your Own Words" badge

**Relevant Context:**
- FR-2.11: free-text input, gap analysis as covered/missed itemized list
- H4 output contract: `{ score, covered[], missed[], misconceptions[], feedback }`
- H6: graceful degradation — if `/api/grade` is unavailable, show MCQ path instead
- `module.explainBack.rubric[]`: `{ concept, weight, mustMention[] }`
- Dev 3 owns the `/api/grade` endpoint; build against a mock response until Sync 3

---

### ST-7 — Doc Drift Findings Screen (P1)

**Status:** `[ ] pending`

**Intent:** Surface Bob's documentation-vs-code contradictions as actionable items. Confirming a finding unlocks a doc-fix quest and shows Bob's drafted correction for the developer to review and edit. This screen makes the "onboarding pays rent" loop visible.

**Expected Outcomes:**
- Summary bar shows total / confirmed / dismissed counts
- Each finding card renders: severity badge, doc claim, code reality, file location
- "Confirm Finding" marks it confirmed in progress state, converts it to a quest, awards "Doc Detective" badge
- "Dismiss" marks it dismissed
- Confirmed findings expand to show a diff-style view of Bob's correction
- Dev can edit the correction text in an inline textarea
- "Stage Correction" marks quest complete, awards "Rent Paid" badge, increments Doc Fixes count

**Todo List:**
1. Create `src/pages/DocDrift.jsx`
2. Build `src/components/DriftSummaryBar.jsx` — counts, progress bar
3. Build `src/components/DriftCard.jsx` — severity badge, claim, reality, location, action buttons, expandable correction view
4. Build `src/components/SeverityBadge.jsx` — high/medium/low, orange accent
5. Build `src/components/DiffView.jsx` — removed lines (red tint on `#393939`), added lines (green tint), line-by-line
6. Build `src/components/CorrectionEditor.jsx` — editable textarea pre-filled with `docDrift[n].suggestedCorrection`
7. Implement drift state in `useProgress`: each drift item has status `pending | confirmed | dismissed`
8. On confirm: create a doc-fix quest in progress state, check badge criteria

**Relevant Context:**
- FR-2.8: display drift as actionable list, confirm/dismiss
- FR-2.12: confirmed → show correction in editable form before staging
- F1: drift → quest conversion
- F3: human-in-the-loop review is mandatory — never auto-stage
- `docDrift[]` fields: `id, docClaim, codeReality, location, severity, suggestedCorrection, correctionDiff`

---

### ST-8 — Impact View (P1)

**Status:** `[ ] pending`

**Intent:** Show the developer (and secondarily judges) hard numbers about onboarding progress. This is the evidence screen for the "clearly demonstrate impact" judging requirement.

**Expected Outcomes:**
- Three KPI cards render with live values from progress state
- Side-by-side comparison table renders with configurable manual baseline (read from manifest or hardcoded for demo)
- Module certification progress renders as a horizontal bar chart (no external charting lib — pure CSS bars)
- Contribution ledger renders as a timeline list

**Todo List:**
1. Create `src/pages/Impact.jsx`
2. Build `src/components/KpiCard.jsx` — large Mono value, label, optional unit
3. Build `src/components/ComparisonTable.jsx` — two-column, Ramp column IBM Blue highlighted
4. Build `src/components/ModuleProgressChart.jsx` — horizontal CSS bars, one per module, label + percentage
5. Build `src/components/ContributionLedger.jsx` — timeline list, each entry: date, title, type badge, XP
6. Compute time-to-first-certification from `useProgress` timestamps
7. Read manual baseline from a `baseline` field in the manifest overview, or a default constant

**Relevant Context:**
- FR-2.10: time-to-first-certification, comprehension score, baseline comparison
- D1: timestamp from repo open → first module certification
- D3: baseline comparison for before/after
- D4: comprehension score = aggregate quiz performance
- Keep chart as CSS — no Chart.js or similar; keeps bundle lean

---

### ST-9 — Polish, Empty States & Loading States (Track 2D)

**Status:** `[ ] pending`

**Intent:** Every screen must handle loading, empty, and error states gracefully. The visual coherence pass ensures the app reads as a finished product, not a prototype, on camera.

**Expected Outcomes:**
- Every data-dependent component has a skeleton loading state
- Every list has a meaningful empty state (icon + message, not blank white box)
- Every async action has a loading indicator
- All screens are visually consistent — same spacing rhythm, same card pattern, same text hierarchy
- Full click-through of every flow completes without visual breaks
- XP award animation plays on certification and quest completion
- Badge award animation plays on first badge earn

**Todo List:**
1. Build `src/components/Skeleton.jsx` — shimmer animation, configurable width/height
2. Add empty states to: ModuleList (no modules), QuestBoard columns (no quests), DocDrift (no findings), ContributionLedger (no entries)
3. Build `src/components/LoadingSpinner.jsx` — IBM Blue, used during API calls in ExplainBack
4. Build `src/components/Toast.jsx` — bottom-right notification for XP gains, badge awards, quest completions
5. Implement `src/hooks/useToast.js` — queue-based toast display
6. Add XP count-up animation to sidebar XP widget on XP change
7. Add badge award animation (scale + fade) in BadgeRow
8. Run a full visual pass: check spacing, font sizes, border consistency, color usage across all 7 screens
9. Verify every navigation path works (no dead links, no blank screens)

**Relevant Context:**
- Track 2D in task plan: "Never cut 2D — Design and usability is 5 points and this is where they're won"
- Skeleton shimmer: CSS animation `animate-pulse` in Tailwind
- Toast: position fixed bottom-right, auto-dismiss after 3s, XP toasts gold, badge toasts have badge icon

---

### ST-10 — Voice Explain-Back UI (P2)

**Status:** `[ ] pending`

**Intent:** Add microphone capture to the explain-back screen so the developer can speak their explanation aloud. The transcript is shown for review before submission. This is the highest-creativity feature and the best demo footage.

**Expected Outcomes:**
- Mic button activates browser microphone with permission prompt
- Recording state is clearly visible (pulsing ring, "Recording…" label, elapsed timer in Mono)
- Stop recording returns a transcript (from `/api/transcribe`)
- Transcript displays in an editable text area for correction
- Submitting the (corrected) transcript goes through the identical `/api/grade` path
- Written fallback tab always visible alongside voice tab
- "In Your Own Words" badge awarded on first successful spoken explain-back

**Todo List:**
1. Add a tab bar to `ExplainBack.jsx` — "Written" and "Voice" tabs
2. Implement `src/hooks/useAudioRecorder.js` — `navigator.mediaDevices.getUserMedia`, MediaRecorder API, blob collection
3. Update `MicButton.jsx` to handle active recording state — pulsing IBM Blue ring, stop icon during recording
4. Build `src/components/RecordingTimer.jsx` — elapsed seconds in IBM Plex Mono
5. Build `src/components/TranscriptReview.jsx` — editable textarea pre-filled with transcript, "Edit to correct transcription errors" hint
6. Wire POST to `/api/transcribe` with audio blob; display loading state during transcription
7. On transcript received: populate TranscriptReview; submission routes to same `useExplainBack` hook
8. Handle microphone permission denied — show a clear error and fall back to written tab

**Relevant Context:**
- FR-5.1: explicit start/stop, visible recording state at all times
- FR-5.3: transcript review before submission
- FR-5.5: written fallback always available
- FR-5.6: request permission explicitly, never record without visible indicator
- J4: transcript feeds identical Module H grading path — no new grading code needed

---

### ST-11 — Sabotage Challenge Screen (P2)

**Status:** `[ ] pending`

**Intent:** Show the developer a symptom description and a timer. They hunt the injected bug and submit a fix. This is the "you learn by debugging" feature — highest engagement, best demo footage after voice explain-back.

**Expected Outcomes:**
- Symptom description renders prominently (only symptom — no file or location hints by default)
- Timer counts up from 0:00 in IBM Plex Mono
- Hint system: three tiered hints available at escalating XP cost, revealed one at a time
- Fix submission field accepts the corrected code
- Correct fix awards "Bug Hunter" badge and XP; incorrect fix shows "Not quite" with option to try again
- Isolation notice clearly visible on screen (FR-2.16)
- Module must be certified before sabotage is accessible

**Todo List:**
1. Create `src/pages/Sabotage.jsx`
2. Build `src/components/SymptomDisplay.jsx` — prominent framing, timer, isolation notice
3. Build `src/components/SabotageTimer.jsx` — MM:SS Mono count-up, starts on page load
4. Build `src/components/HintPanel.jsx` — three hint cards, each locked until previous bought; XP cost label; "Reveal Hint (-N XP)" button
5. Build `src/components/FixSubmission.jsx` — code textarea (Mono font), "Submit Fix" button
6. Implement fix verification in `src/hooks/useSabotage.js` — compare submitted fix against `sabotage[n].correctOriginal`
7. On correct: award XP, award "Bug Hunter" badge, show success state
8. Add isolation notice banner: "This challenge operates on an isolated copy. Your repository is not affected."

**Relevant Context:**
- FR-2.14: symptom only, running timer, tiered hints at XP cost
- FR-2.15: verify fix against known-correct original
- FR-2.16: isolation notice mandatory
- G3: hint tiers — narrow to file → narrow to function → reveal line
- G5: difficulty scales with level (use `sabotage[n].difficulty` to filter appropriate challenge)

---

## Integration Notes (for Sync 3)

When Dev 3's backend is ready, swap these in `src/hooks/`:

| Hook | Current (dev) | After Sync 3 |
|---|---|---|
| `useManifest` | Loads fixture JSON file | GET `/api/manifest?repo=X&commit=Y` |
| `useProgress` | Local React state | GET/POST `/api/progress` |
| `useExplainBack` | Mock response | POST `/api/grade` |
| `useAudioRecorder` | No transcribe call | POST `/api/transcribe` |

Keep all API calls isolated in hooks — never fetch directly in components. This makes the swap surgical and testable.

---

## File Structure

```
ramp-frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Header.jsx
│   │   ├── ui/
│   │   │   ├── Badge.jsx
│   │   │   ├── RiskBadge.jsx
│   │   │   ├── ComplexityBadge.jsx
│   │   │   ├── CertificationChip.jsx
│   │   │   ├── SeverityBadge.jsx
│   │   │   ├── XpChip.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── Toast.jsx
│   │   ├── dashboard/
│   │   │   ├── StatCard.jsx
│   │   │   ├── NextAction.jsx
│   │   │   └── BadgeRow.jsx
│   │   ├── modules/
│   │   │   ├── ModuleCard.jsx
│   │   │   ├── MermaidDiagram.jsx
│   │   │   └── KeyFilesList.jsx
│   │   ├── quiz/
│   │   │   ├── QuizCard.jsx
│   │   │   ├── AnswerOption.jsx
│   │   │   ├── QuizProgress.jsx
│   │   │   └── QuizResult.jsx
│   │   ├── explain/
│   │   │   ├── ExplainPrompt.jsx
│   │   │   ├── ExplainTextarea.jsx
│   │   │   ├── MicButton.jsx
│   │   │   ├── RecordingTimer.jsx
│   │   │   ├── TranscriptReview.jsx
│   │   │   ├── GapAnalysis.jsx
│   │   │   └── ConceptTag.jsx
│   │   ├── quests/
│   │   │   ├── KanbanColumn.jsx
│   │   │   └── QuestCard.jsx
│   │   ├── drift/
│   │   │   ├── DriftSummaryBar.jsx
│   │   │   ├── DriftCard.jsx
│   │   │   ├── DiffView.jsx
│   │   │   └── CorrectionEditor.jsx
│   │   ├── impact/
│   │   │   ├── KpiCard.jsx
│   │   │   ├── ComparisonTable.jsx
│   │   │   ├── ModuleProgressChart.jsx
│   │   │   └── ContributionLedger.jsx
│   │   └── sabotage/
│   │       ├── SymptomDisplay.jsx
│   │       ├── SabotageTimer.jsx
│   │       ├── HintPanel.jsx
│   │       └── FixSubmission.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── ModuleList.jsx
│   │   ├── ModuleDetail.jsx
│   │   ├── ExplainBack.jsx
│   │   ├── QuestBoard.jsx
│   │   ├── DocDrift.jsx
│   │   ├── Impact.jsx
│   │   └── Sabotage.jsx
│   ├── hooks/
│   │   ├── useManifest.js
│   │   ├── useProgress.js
│   │   ├── useQuiz.js
│   │   ├── useExplainBack.js
│   │   ├── useAudioRecorder.js
│   │   ├── useSabotage.js
│   │   └── useToast.js
│   ├── context/
│   │   ├── ManifestContext.jsx
│   │   └── ProgressContext.jsx
│   ├── main.jsx
│   └── index.css
├── fixtures/
│   └── sample-manifest.json
├── tailwind.config.js
├── vite.config.js
└── package.json
```
