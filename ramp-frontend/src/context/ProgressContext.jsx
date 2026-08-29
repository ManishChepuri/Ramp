import { createContext, useContext, useState, useCallback } from 'react'

const ProgressContext = createContext(null)

const XP_PER_LEVEL = [0, 100, 250, 500, 1000]
const LEVEL_NAMES  = ['Visitor', 'Tourist', 'Resident', 'Local', 'Maintainer']

function computeLevel(xp) {
  let level = 0
  for (let i = 0; i < XP_PER_LEVEL.length; i++) {
    if (xp >= XP_PER_LEVEL[i]) level = i
  }
  return level
}

export function ProgressProvider({ children }) {
  const [xp, setXp]                     = useState(0)
  const [certifications, setCertifications] = useState([])      // module ids
  const [questStates, setQuestStates]   = useState({})          // { questId: 'available'|'in-progress'|'complete' }
  const [driftStates, setDriftStates]   = useState({})          // { driftId: 'pending'|'confirmed'|'dismissed' }
  const [earnedBadges, setEarnedBadges] = useState([])          // badge ids
  const [quizHistory, setQuizHistory]   = useState({})          // { moduleId: { score, attempts, lastAttempt } }
  const [contributions, setContributions] = useState([])        // { id, title, type, xp, date }
  const [sessionStart]                  = useState(Date.now())
  const [firstCertAt, setFirstCertAt]   = useState(null)

  const level     = computeLevel(xp)
  const levelName = LEVEL_NAMES[level]
  const nextLevelXp = XP_PER_LEVEL[level + 1] ?? null
  const prevLevelXp = XP_PER_LEVEL[level] ?? 0

  const awardXp = useCallback((amount) => {
    setXp(prev => prev + amount)
  }, [])

  const awardBadge = useCallback((badgeId) => {
    setEarnedBadges(prev => prev.includes(badgeId) ? prev : [...prev, badgeId])
  }, [])

  const certifyModule = useCallback((moduleId) => {
    setCertifications(prev => {
      if (prev.includes(moduleId)) return prev
      if (!firstCertAt) setFirstCertAt(Date.now())
      return [...prev, moduleId]
    })
  }, [firstCertAt])

  const recordQuizResult = useCallback((moduleId, score, total) => {
    setQuizHistory(prev => ({
      ...prev,
      [moduleId]: {
        score,
        total,
        pct: Math.round((score / total) * 100),
        attempts: (prev[moduleId]?.attempts ?? 0) + 1,
        lastAttempt: Date.now(),
      }
    }))
  }, [])

  const setQuestStatus = useCallback((questId, status) => {
    setQuestStates(prev => ({ ...prev, [questId]: status }))
  }, [])

  const confirmDrift = useCallback((driftId) => {
    setDriftStates(prev => ({ ...prev, [driftId]: 'confirmed' }))
  }, [])

  const dismissDrift = useCallback((driftId) => {
    setDriftStates(prev => ({ ...prev, [driftId]: 'dismissed' }))
  }, [])

  const addContribution = useCallback((entry) => {
    setContributions(prev => [{ ...entry, date: new Date().toISOString() }, ...prev])
  }, [])

  const isCertified = (moduleId) => certifications.includes(moduleId)

  const isModuleLocked = (module) =>
    (module.prerequisites ?? []).some(prereqId => !certifications.includes(prereqId))

  const completedQuests = Object.values(questStates).filter(s => s === 'complete').length
  const docFixesShipped = contributions.filter(c => c.type === 'doc-fix').length

  const timeToFirstCert = firstCertAt
    ? Math.round((firstCertAt - sessionStart) / 60000)
    : null

  const avgComprehension = (() => {
    const scores = Object.values(quizHistory).map(h => h.pct)
    if (!scores.length) return null
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  })()

  return (
    <ProgressContext.Provider value={{
      xp, level, levelName, nextLevelXp, prevLevelXp,
      certifications, earnedBadges, questStates, driftStates,
      quizHistory, contributions, completedQuests, docFixesShipped,
      timeToFirstCert, avgComprehension, sessionStart,
      awardXp, awardBadge, certifyModule, recordQuizResult,
      setQuestStatus, confirmDrift, dismissDrift, addContribution,
      isCertified, isModuleLocked,
    }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  return useContext(ProgressContext)
}
