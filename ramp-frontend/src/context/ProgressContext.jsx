import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

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

// Stable userId stored in localStorage — no auth required
function getUserId() {
  let id = localStorage.getItem('ramp_userId')
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 9)
    localStorage.setItem('ramp_userId', id)
  }
  return id
}

export function ProgressProvider({ children }) {
  const userId = useRef(getUserId()).current

  const [xp, setXp]                       = useState(0)
  const [certifications, setCertifications] = useState([])
  const [questStates, setQuestStates]     = useState({})
  const [driftStates, setDriftStates]     = useState({})
  const [earnedBadges, setEarnedBadges]   = useState([])
  const [quizHistory, setQuizHistory]     = useState({})
  const [contributions, setContributions] = useState([])
  const [sessionStart]                    = useState(Date.now())
  const [firstCertAt, setFirstCertAt]     = useState(null)

  // ── Load from server on mount ────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/progress/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.xp               != null) setXp(d.xp)
        if (d.certifications)           setCertifications(d.certifications)
        if (d.badges)                   setEarnedBadges(d.badges)
        if (d.quests)                   setQuestStates(d.quests)
        if (d.quizHistory)              setQuizHistory(d.quizHistory)
        if (d.contributionLedger)       setContributions(d.contributionLedger)
        // driftStates is UI-only, not persisted server-side
      })
      .catch(() => { /* Cloudant unreachable — start fresh, local state is fine */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Persist full state to server after every mutation ────────────────────────
  const persist = useCallback((patch) => {
    // patch is the merged snapshot the caller already computed
    fetch(`/api/progress/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => { /* non-blocking — local state is the source of truth */ })
  }, [userId])

  // ── Derived values ───────────────────────────────────────────────────────────
  const level      = computeLevel(xp)
  const levelName  = LEVEL_NAMES[level]
  const nextLevelXp = XP_PER_LEVEL[level + 1] ?? null
  const prevLevelXp = XP_PER_LEVEL[level] ?? 0

  // ── Mutators (each persists after updating) ──────────────────────────────────
  const awardXp = useCallback((amount) => {
    setXp(prev => {
      const next = prev + amount
      persist({ userId, xp: next })
      return next
    })
  }, [persist, userId])

  const awardBadge = useCallback((badgeId) => {
    setEarnedBadges(prev => {
      if (prev.includes(badgeId)) return prev
      const next = [...prev, badgeId]
      persist({ userId, badges: next })
      return next
    })
  }, [persist, userId])

  const certifyModule = useCallback((moduleId) => {
    setCertifications(prev => {
      if (prev.includes(moduleId)) return prev
      if (!firstCertAt) setFirstCertAt(Date.now())
      const next = [...prev, moduleId]
      persist({ userId, certifications: next })
      return next
    })
  }, [firstCertAt, persist, userId])

  const recordQuizResult = useCallback((moduleId, score, total) => {
    setQuizHistory(prev => {
      const next = {
        ...prev,
        [moduleId]: {
          score,
          total,
          pct: Math.round((score / total) * 100),
          attempts: (prev[moduleId]?.attempts ?? 0) + 1,
          lastAttempt: Date.now(),
        }
      }
      persist({ userId, quizHistory: next })
      return next
    })
  }, [persist, userId])

  const setQuestStatus = useCallback((questId, status) => {
    setQuestStates(prev => {
      const next = { ...prev, [questId]: status }
      persist({ userId, quests: next })
      return next
    })
  }, [persist, userId])

  const confirmDrift = useCallback((driftId) => {
    setDriftStates(prev => ({ ...prev, [driftId]: 'confirmed' }))
  }, [])

  const dismissDrift = useCallback((driftId) => {
    setDriftStates(prev => ({ ...prev, [driftId]: 'dismissed' }))
  }, [])

  const addContribution = useCallback((entry) => {
    setContributions(prev => {
      const next = [{ ...entry, date: new Date().toISOString() }, ...prev]
      persist({ userId, contributionLedger: next })
      return next
    })
  }, [persist, userId])

  const isCertified    = (moduleId) => certifications.includes(moduleId)
  const isModuleLocked = (module) =>
    (module.prerequisites ?? []).some(prereqId => !certifications.includes(prereqId))

  const completedQuests  = Object.values(questStates).filter(s => s === 'complete').length
  const docFixesShipped  = contributions.filter(c => c.type === 'doc-fix').length

  const timeToFirstCert  = firstCertAt
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
