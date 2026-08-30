import { useState, useCallback } from 'react'

export function useExplainBack() {
  const [phase, setPhase]   = useState('idle')    // 'idle' | 'submitting' | 'result' | 'error'
  const [result, setResult] = useState(null)
  const [error, setError]   = useState(null)

  const submit = useCallback(async (moduleId, explanation, rubric) => {
    if (!explanation.trim()) return
    setPhase('submitting')
    setError(null)
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, explanation, rubric }),
      })
      const data = await res.json()
      if (data.degraded) {
        setError('Grading service unavailable. Try the quiz instead.')
        setPhase('error')
        return
      }
      setResult(data)
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
