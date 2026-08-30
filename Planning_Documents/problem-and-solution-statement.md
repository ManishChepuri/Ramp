# Ramp — Problem and Solution Statement

## The Problem

Every developer who joins a new team faces the same invisible tax: reconstructing knowledge that already exists in the codebase, commit history, and documentation — but is scattered, stale, or locked in a senior developer's head. The average engineer takes two to four weeks to make their first meaningful contribution to an unfamiliar codebase. During that time, the team pays in senior developer hours, slowed delivery, and the constant risk that the new hire misunderstands something critical and introduces a subtle bug in week three.

Existing solutions are static READMEs that rot the moment the code changes, or tribal knowledge passed through hours of one-on-one sessions that cannot scale. There is no way for a team to know whether the new developer actually understood what they were told, and no mechanism to recover value from the onboarding investment while it is happening.

## The Solution

Ramp is a CLI-launched local web application that generates a structured, interactive onboarding curriculum for any codebase using IBM Bob, then verifies that the developer actually understood it.

A single terminal command — `ramp generate ./repo` — invokes Bob's agent pipeline, which dispatches parallel subagents across the codebase to produce a structured manifest: module summaries, architecture diagrams, quizzes, explain-back rubrics, ranked starter tasks, and documentation drift findings. This manifest becomes the curriculum.

The developer then runs `ramp open`, which starts a local server and opens a browser interface showing a quest board, progress dashboard, module quizzes, and an explain-back screen. To certify on a module, the developer must either pass a quiz or explain the module in their own words — spoken or written — which is graded in real time by a watsonx.ai Granite model against Bob's rubric, returning specific gaps and misconceptions rather than a bare score. Progress, certifications, and badges are persisted in IBM Cloudant so sessions resume exactly where they left off.

The first quests Ramp offers are the documentation drift findings Bob detected — places where the existing docs contradict the actual code. The developer confirms the finding, reviews Bob's drafted correction, and ships it. The person who knows least about the codebase improves it on day one, so onboarding produces value instead of only consuming it.

The impact is measurable: we timed a developer answering five questions about an unfamiliar codebase manually and then using Ramp, recording both time and correctness. The results are shown in the demo video.

## Target Users

The primary user is any developer joining an unfamiliar codebase: a new hire, an internal transfer, an open-source contributor, or a contractor. The secondary user is the team lead or onboarding buddy who currently loses hours to hand-holding and wants visibility into who is certified on what.

## Why It Is Creative and Unique

Explanation is commodity. Every AI coding tool explains code faster. Ramp is the only onboarding tool that verifies comprehension and certifies readiness. The spoken explain-back — where the developer talks to the tool and is graded on what they said — reframes Ramp as a whiteboard interview simulator for the codebase being joined. The contribution loop, where onboarding produces real documentation improvements, inverts the premise that onboarding is pure cost. These are not incremental improvements to an existing workflow; they are a different product category.
