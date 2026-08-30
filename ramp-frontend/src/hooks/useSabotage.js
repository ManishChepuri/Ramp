import { useCallback, useMemo, useState } from 'react'
import { deriveExtraHint, deriveSolution } from '../lib/sabotageDiff'

export const MAX_ATTEMPTS = 5
export const AUTO_HINT_AT = 3   // after this many failed attempts, unlock a fresh hint
export const XP_COSTS = [5, 10, 20]  // cost to reveal each canned progressive hint
const VERIFY_TIMEOUT_MS = 30_000    // give up on a hung verify rather than spin forever

/**
 * Drives the Sabotage bug-hunt: the user edits the file in the integrated IDE
 * and submits it here. Verification runs server-side in an isolated scratch
 * copy (POST /api/sabotage/verify).
 *
 * Phases: 'hunting' | 'verifying' | 'correct' | 'revealed'
 *   - 'revealed' = the 5-attempt limit was hit; bug location + fix are shown.
 *
 * @param sabotageCase  the manifest sabotage entry
 * @param opts.moduleId       owning module id (sent to the verifier)
 * @param opts.initial        persisted { attempts, solved } to restore on reload
 * @param opts.onSolved       called once when a submission passes
 */
export function useSabotage(sabotageCase, opts = {}) {
  const { moduleId, initial, onSolved } = opts

  const restored = useMemo(() => {
    const a = Math.max(0, Number(initial?.attempts) || 0)
    if (initial?.solved) return { attempts: a, phase: 'correct', autoHint: null, solution: null }
    if (a >= MAX_ATTEMPTS) {
      return { attempts: a, phase: 'revealed', autoHint: deriveExtraHint(sabotageCase), solution: deriveSolution(sabotageCase) }
    }
    return {
      attempts: a,
      phase: 'hunting',
      autoHint: a >= AUTO_HINT_AT ? deriveExtraHint(sabotageCase) : null,
      solution: null,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sabotageCase?.id])

  const [attempts, setAttempts]         = useState(restored.attempts)
  const [phase, setPhase]               = useState(restored.phase)
  const [autoHint, setAutoHint]         = useState(restored.autoHint)
  const [solution, setSolution]         = useState(restored.solution)
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [lastResult, setLastResult]     = useState(null)
  const [flashWrong, setFlashWrong]     = useState(false)

  const hints    = sabotageCase?.hints ?? []
  const maxHints = hints.length

  const revealHint = useCallback(() => {
    setHintsRevealed(n => (n < maxHints ? n + 1 : n))
  }, [maxHints])

  const submitFix = useCallback(async (content) => {
    if (phase === 'verifying' || phase === 'correct') return null
    setPhase('verifying')
    setFlashWrong(false)

    let result
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), VERIFY_TIMEOUT_MS)
    try {
      const res = await fetch('/api/sabotage/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          moduleId,
          sabotageId: sabotageCase?.id,
          file: sabotageCase?.file,
          content,
          quick: phase === 'revealed',
        }),
      })
      result = await res.json()
    } catch (err) {
      result = err?.name === 'AbortError'
        ? { passed: false, method: 'error', detail: 'Verification timed out. Try again, or match the revealed solution exactly.' }
        : { passed: false, method: 'error', detail: 'Could not reach the verifier — check that the Ramp server is running.' }
    } finally {
      clearTimeout(timer)
    }

    setLastResult(result)

    // Transport / server errors don't burn an attempt.
    if (result.method === 'error' || result.method === 'unavailable') {
      setPhase(p => (p === 'revealed' ? 'revealed' : 'hunting'))
      return result
    }

    if (result.passed) {
      const total = phase === 'revealed' ? attempts : attempts + 1
      if (phase !== 'revealed') setAttempts(total)
      setPhase('correct')
      onSolved?.({ attempts: total, revealed: phase === 'revealed', method: result.method })
      return result
    }

    // Already past the limit — keep showing the reveal, no attempt accounting.
    if (phase === 'revealed') return result

    const n = attempts + 1
    setAttempts(n)
    setFlashWrong(true)
    setTimeout(() => setFlashWrong(false), 1600)

    if (n >= MAX_ATTEMPTS) {
      setSolution(deriveSolution(sabotageCase))
      setAutoHint(prev => prev || deriveExtraHint(sabotageCase))
      setPhase('revealed')
    } else {
      if (n >= AUTO_HINT_AT) setAutoHint(prev => prev || deriveExtraHint(sabotageCase))
      setPhase('hunting')
    }
    return result
  }, [phase, attempts, moduleId, sabotageCase, onSolved])

  const reset = useCallback(() => {
    setAttempts(0)
    setPhase('hunting')
    setAutoHint(null)
    setSolution(null)
    setHintsRevealed(0)
    setLastResult(null)
    setFlashWrong(false)
  }, [])

  return {
    phase,
    verifying: phase === 'verifying',
    attempts,
    attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts),
    MAX_ATTEMPTS,
    hints,
    hintsRevealed,
    maxHints,
    autoHint,
    solution,
    lastResult,
    flashWrong,
    XP_COSTS,
    revealHint,
    submitFix,
    reset,
  }
}
