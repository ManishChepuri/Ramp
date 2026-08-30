import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../../context/ProgressContext'
import { useCountUp } from '../../hooks/useCountUp'

/**
 * Level name + XP + progress bar, tinted with the current level's accent.
 * Lives in the sidebar when it's open, and in a floating card when it's collapsed.
 */
export default function XpWidget() {
  const { xp, levelName, levelAccent, nextLevelXp, prevLevelXp } = useProgress()
  const animatedXp = useCountUp(xp, 700)

  const barPct = nextLevelXp
    ? Math.round(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)
    : 100

  // Brief flash when XP goes up.
  const [flash, setFlash] = useState(false)
  const prevXp = useRef(xp)
  useEffect(() => {
    if (xp > prevXp.current) {
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 600)
      prevXp.current = xp
      return () => clearTimeout(t)
    }
    prevXp.current = xp
  }, [xp])

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span
          className="text-xs font-semibold uppercase tracking-wider transition-colors duration-500"
          style={{ color: levelAccent }}
        >
          {levelName}
        </span>
        <span
          className="font-mono text-xs font-semibold transition-colors duration-300 tabular-nums"
          style={{ color: flash ? '#ffffff' : levelAccent }}
        >
          {animatedXp} XP
        </span>
      </div>

      <div className="h-1.5 bg-carbon-layer-02 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${barPct}%`, background: flash ? '#ffffff' : levelAccent }}
        />
      </div>

      {nextLevelXp ? (
        <p className="font-mono text-xs text-carbon-text-placeholder">
          {nextLevelXp - xp} XP to next level
        </p>
      ) : (
        <p className="text-xs font-medium" style={{ color: levelAccent }}>Max level reached ✦</p>
      )}
    </div>
  )
}
