import { useState, useCallback } from 'react'

const MOCK_RESPONSE = {
  score: 72,
  covered: ['Request routing through Express middleware', 'JWT token validation in auth.js'],
  missed:  ['Error handling via the central errorHandler middleware', 'Body parser and CORS setup in app.js'],
  misconceptions: ['Auth middleware runs after route handlers — it actually runs before'],
  feedback: 'Good understanding of the routing layer. The key gap is the error handling pipeline — errors thrown in route handlers are not caught locally but passed to a central middleware via next(err).',
}

export function useExplainBack() {
  const [phase, setPhase]   = useState('idle')    // 'idle' | 'submitting' | 'result' | 'error'
  const [result, setResult] = useState(null)
  const [error, setError]   = useState(null)

  const submit = useCallback(async (explanation, rubric) => {
    if (!explanation.trim()) return
    setPhase('submitting')
    setError(null)
    try {
      // After Sync 3: replace with real fetch('/api/grade', { method:'POST', ... })
      await new Promise(r => setTimeout(r, 1400))   // simulate latency
      setResult(MOCK_RESPONSE)
      setPhase('result')
    } catch (e) {
      setError('Grading service unavailable. Try the quiz instead.')
      setPhase('error')
    }
  }, [])

  const reset = useCallback(() => {
    setPhase('idle')
    setResult(null)
    setError(null)
  }, [])

  return { phase, result, error, submit, reset }
}
