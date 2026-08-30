'use strict'

const fetch = require('node-fetch')
const { getIAMToken } = require('./iam')

const WATSONX_URL = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com'
const PROJECT_ID = process.env.WATSONX_PROJECT_ID
const API_KEY = process.env.WATSONX_API_KEY

// Use granite-4-h-small — supports text_generation, within budget,
// not on the out-of-scope list (llama-3-405b, mistral-medium-2505, mistral-small-3-1 are excluded).
const MODEL_ID = 'ibm/granite-4-h-small'
const MAX_RETRIES = 2

/**
 * Builds the chat messages array that instructs the model to grade an
 * explain-back submission against a rubric and return strict JSON.
 * granite-4-h-small uses the /text/chat endpoint, not /text/generation.
 */
function buildGradingMessages(explanation, rubric) {
  const rubricText = rubric
    .map((r, i) => `${i + 1}. "${r.concept}" (weight: ${r.weight})`)
    .join('\n')

  const content = `You are a technical onboarding assessor. Grade the developer's explanation against the rubric below.

RUBRIC:
${rubricText}

DEVELOPER'S EXPLANATION:
${explanation}

Return ONLY valid JSON with this exact shape — no markdown, no prose, no extra keys:
{
  "score": <integer 0-100, percentage of total rubric weight covered>,
  "covered": [<rubric concept strings that were addressed>],
  "missed": [<rubric concept strings that were absent or too vague>],
  "misconceptions": [<statements in the explanation that directly contradict the rubric — empty array if none>],
  "feedback": "<one short paragraph of constructive feedback for the developer>"
}`

  return [{ role: 'user', content }]
}

/**
 * Calls watsonx.ai to grade a free-text explanation against a rubric.
 * Uses the /text/chat endpoint (required by granite-4-h-small).
 * Retries up to MAX_RETRIES times if the response is not valid JSON.
 * Returns the degraded response shape if watsonx is unavailable.
 */
async function gradeExplanation(explanation, rubric) {
  const degraded = {
    score: null,
    covered: [],
    missed: [],
    misconceptions: [],
    feedback: 'Grading service unavailable. Please complete the multiple-choice quiz to certify on this module.',
    degraded: true,
  }

  if (!API_KEY || !PROJECT_ID) {
    console.warn('[watsonx] Missing WATSONX_API_KEY or WATSONX_PROJECT_ID — returning degraded response')
    return degraded
  }

  const messages = buildGradingMessages(explanation, rubric)
  const endpoint = `${WATSONX_URL}/ml/v1/text/chat?version=2023-05-29`

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const token = await getIAMToken(API_KEY)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model_id: MODEL_ID,
          project_id: PROJECT_ID,
          messages,
          parameters: {
            max_tokens: 600,
            temperature: 0.1,  // low temperature for consistency (FR-3.4)
          },
        }),
      })

      if (!res.ok) {
        console.warn(`[watsonx] HTTP ${res.status} on attempt ${attempt + 1}`)
        if (attempt === MAX_RETRIES) return degraded
        continue
      }

      const data = await res.json()
      const raw = data?.choices?.[0]?.message?.content?.trim()

      if (!raw) {
        console.warn(`[watsonx] Empty response content on attempt ${attempt + 1}`)
        if (attempt === MAX_RETRIES) return degraded
        continue
      }

      // Validate — must be parseable JSON with the required keys (FR-3.3)
      let parsed
      try {
        // Strip potential markdown code fences the model might emit anyway
        const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
        parsed = JSON.parse(cleaned)
      } catch {
        console.warn(`[watsonx] Malformed JSON on attempt ${attempt + 1}: ${raw.slice(0, 120)}`)
        if (attempt === MAX_RETRIES) return degraded
        continue
      }

      const required = ['score', 'covered', 'missed', 'misconceptions', 'feedback']
      const valid = required.every(k => k in parsed)
      if (!valid) {
        console.warn(`[watsonx] Missing required keys on attempt ${attempt + 1}`)
        if (attempt === MAX_RETRIES) return degraded
        continue
      }

      return {
        score: Number(parsed.score),
        covered: Array.isArray(parsed.covered) ? parsed.covered : [],
        missed: Array.isArray(parsed.missed) ? parsed.missed : [],
        misconceptions: Array.isArray(parsed.misconceptions) ? parsed.misconceptions : [],
        feedback: String(parsed.feedback),
      }
    } catch (err) {
      console.warn(`[watsonx] Unexpected error on attempt ${attempt + 1}:`, err.message)
      if (attempt === MAX_RETRIES) return degraded
    }
  }

  return degraded
}

module.exports = { gradeExplanation }
