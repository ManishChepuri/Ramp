import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { LEVELS, LEVEL_NAMES, XP_PER_LEVEL, levelIndexForXp } from '../lib/levels'

const ProgressContext = createContext(null)

const computeLevel = levelIndexForXp

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
  const [sabotageHistory, setSabotageHistory] = useState({})
  const [contributions, setContributions] = useState([])
  const [sessionStart]                    = useState(Date.now())
  const [firstCertAt, setFirstCertAt]     = useState(null)

  // Level-up detection — see the effect below. `levelUp` holds { fromIdx, toIdx }
  // while the celebration modal is showing, or null.
  const [levelUp, setLevelUp] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const prevXpRef = useRef(0)
  const absorbedHydrationRef = useRef(false)

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
        if (d.sabotageHistory)          setSabotageHistory(d.sabotageHistory)
        if (d.contributionLedger)       setContributions(d.contributionLedger)
        if (d.driftStates)              setDriftStates(d.driftStates)
      })
      .catch(() => { /* Cloudant unreachable — start fresh, local state is fine */ })
      .finally(() => setHydrated(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fire the level-up modal only on a real climb (never on initial hydration) ─
  useEffect(() => {
    if (!hydrated) { prevXpRef.current = xp; return }
    // The first render after the server load lands the stored XP in one jump —
    // absorb it silently so we don't celebrate a level the user reached last session.
    if (!absorbedHydrationRef.current) {
      absorbedHydrationRef.current = true
      prevXpRef.current = xp
      return
    }
    const before = computeLevel(prevXpRef.current)
    const after  = computeLevel(xp)
    if (after > before) setLevelUp({ fromIdx: before, toIdx: after })
    prevXpRef.current = xp
  }, [xp, hydrated])

  const dismissLevelUp = useCallback(() => setLevelUp(null), [])

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
  const level       = computeLevel(xp)
  const levelName   = LEVEL_NAMES[level]
  const levelAccent = LEVELS[level].accent
  const levelBlurb  = LEVELS[level].blurb
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

  // Merge a patch into one sabotage case's record and persist the whole map.
  const recordSabotage = useCallback((sabotageId, patch) => {
    setSabotageHistory(prev => {
      const next = {
        ...prev,
        [sabotageId]: { ...(prev[sabotageId] || {}), ...patch, lastAttempt: Date.now() },
      }
      persist({ userId, sabotageHistory: next })
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

  // Drift finding lifecycle: pending -> confirmed | dismissed -> resolved.
  // Persisted so a developer's triage survives a reload (FR-2.9 / FR-4.2).
  const setDriftState = useCallback((driftId, state) => {
    setDriftStates(prev => {
      const next = { ...prev, [driftId]: state }
      persist({ userId, driftStates: next })
      return next
    })
  }, [persist, userId])

  const confirmDrift = useCallback((driftId) => setDriftState(driftId, 'confirmed'), [setDriftState])
  const dismissDrift = useCallback((driftId) => setDriftState(driftId, 'dismissed'), [setDriftState])
  const reopenDrift  = useCallback((driftId) => setDriftState(driftId, 'pending'), [setDriftState])
  const resolveDrift = useCallback((driftId) => setDriftState(driftId, 'resolved'), [setDriftState])

  const addContribution = useCallback((entry) => {
    setContributions(prev => {
      // De-dupe by id so shipping the same doc fix twice can't double-count.
      if (entry.id && prev.some(c => c.id === entry.id)) return prev
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
      xp, level, levelName, levelAccent, levelBlurb, nextLevelXp, prevLevelXp,
      levelUp, dismissLevelUp,
      certifications, earnedBadges, questStates, driftStates,
      quizHistory, sabotageHistory, contributions, completedQuests, docFixesShipped,
      timeToFirstCert, avgComprehension, sessionStart,
      awardXp, awardBadge, certifyModule, recordQuizResult, recordSabotage,
      setQuestStatus, confirmDrift, dismissDrift, reopenDrift, resolveDrift, addContribution,
      isCertified, isModuleLocked,
    }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  return useContext(ProgressContext)
}
