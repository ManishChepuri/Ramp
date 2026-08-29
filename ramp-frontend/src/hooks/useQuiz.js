import { useState, useCallback } from 'react'

export function useQuiz(questions = []) {
  const [index, setIndex]       = useState(0)
  const [selected, setSelected] = useState(null)   // option index
  const [revealed, setRevealed] = useState(false)
  const [answers, setAnswers]   = useState([])      // { correct: bool }
  const [phase, setPhase]       = useState('quiz')  // 'quiz' | 'result'

  const current = questions[index] ?? null
  const isLast  = index === questions.length - 1

  const select = useCallback((optionIndex) => {
    if (!revealed) setSelected(optionIndex)
  }, [revealed])

  const check = useCallback(() => {
    if (selected === null) return
    setRevealed(true)
  }, [selected])

  const next = useCallback(() => {
    const correct = selected === current?.correctIndex
    setAnswers(prev => [...prev, { correct }])
    if (isLast) {
      setPhase('result')
    } else {
      setIndex(i => i + 1)
      setSelected(null)
      setRevealed(false)
    }
  }, [selected, current, isLast])

  const reset = useCallback(() => {
    setIndex(0)
    setSelected(null)
    setRevealed(false)
    setAnswers([])
    setPhase('quiz')
  }, [])

  const score    = answers.filter(a => a.correct).length
  const total    = questions.length
  const pct      = total > 0 ? Math.round((score / total) * 100) : 0
  const passed   = pct >= 80

  return {
    current, index, total, selected, revealed, phase,
    score, pct, passed,
    select, check, next, reset,
  }
}
