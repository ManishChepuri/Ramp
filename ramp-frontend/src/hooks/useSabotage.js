import { useState, useCallback } from 'react'

/**
 * Manages the sabotage challenge state for a given sabotage case.
 * Verifies a submitted fix against the known-correct original.
 *
 * Phases: 'hunting' | 'correct' | 'wrong'
 */
export function useSabotage(sabotageCase) {
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [fix, setFix]       = useState('')
  const [phase, setPhase]   = useState('hunting')  // 'hunting' | 'correct' | 'wrong'
  const [attempts, setAttempts] = useState(0)

  const hints    = sabotageCase?.hints ?? []
  const maxHints = hints.length

  const XP_COSTS = [5, 10, 20]  // cost to reveal each progressive hint

  const revealHint = useCallback(() => {
    if (hintsRevealed < maxHints) {
      setHintsRevealed(n => n + 1)
    }
  }, [hintsRevealed, maxHints])

  const submitFix = useCallback((submittedFix, spendXp) => {
    setAttempts(n => n + 1)
    const correct = sabotageCase?.correctOriginal
    if (!correct) return false

    // Flexible matching: trim whitespace, compare key tokens
    const normalise = s => s.replace(/\s+/g, ' ').trim()
    const isCorrect = normalise(submittedFix).includes(normalise(correct)) ||
                      normalise(correct).includes(normalise(submittedFix))

    if (isCorrect) {
      setPhase('correct')
      return true
    } else {
      setPhase('wrong')
      setTimeout(() => setPhase('hunting'), 1800)
      return false
    }
  }, [sabotageCase])

  const reset = useCallback(() => {
    setHintsRevealed(0)
    setFix('')
    setPhase('hunting')
    setAttempts(0)
  }, [])

  return {
    phase, fix, setFix, hintsRevealed, hints, maxHints, attempts,
    XP_COSTS, revealHint, submitFix, reset,
  }
}
