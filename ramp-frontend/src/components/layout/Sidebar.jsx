import { NavLink } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useProgress }  from '../../context/ProgressContext'
import { useCountUp }   from '../../hooks/useCountUp'

const NAV = [
  { to: '/',        label: 'Dashboard',   icon: SquaresIcon   },
  { to: '/modules', label: 'Modules',     icon: LayersIcon    },
  { to: '/quests',  label: 'Quest Board', icon: FlagIcon      },
  { to: '/drift',   label: 'Doc Drift',   icon: AlertIcon     },
  { to: '/impact',  label: 'Impact',      icon: ChartIcon     },
]

// ─── Inline SVG icon components ─────────────────────────────────────────────
function SquaresIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}
function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <path d="M8 1L15 5L8 9L1 5L8 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M1 8L8 12L15 8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M1 11L8 15L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}
function FlagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <path d="M3 1V15M3 1H12L9 5L12 9H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M8 6V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <path d="M1 12L5 7L9 10L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 15H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { xp, levelName, nextLevelXp, prevLevelXp, level } = useProgress()
  const animatedXp = useCountUp(xp, 700)

  const barPct = nextLevelXp
    ? Math.round(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)
    : 100

  // Flash animation when XP changes
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
    <aside className="w-60 flex-shrink-0 bg-carbon-layer-01 border-r border-carbon-border flex flex-col h-full select-none">
      {/* Wordmark */}
      <div className="h-12 flex items-center px-5 border-b border-carbon-border gap-2">
        <div className="w-6 h-6 bg-carbon-brand rounded flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 10V2H7C9 2 10 3 10 4.5C10 6 9 7 7 7H2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-bold text-base tracking-tight text-carbon-text-primary">Ramp</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors duration-150 ${
                isActive
                  ? 'bg-carbon-layer-02 text-carbon-text-primary font-semibold'
                  : 'text-carbon-text-secondary hover:bg-carbon-layer-02 hover:text-carbon-text-primary'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-carbon-brand' : ''}>
                  <Icon />
                </span>
                {label}
                {isActive && (
                  <span className="ml-auto w-1 h-4 rounded-full bg-carbon-brand flex-shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-carbon-border" />

      {/* XP Widget */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-carbon-text-secondary uppercase tracking-wider">
            {levelName}
          </span>
          <span className={`font-mono text-xs font-semibold transition-colors duration-300 ${flash ? 'text-white' : 'text-carbon-xp-gold'}`}>
            {animatedXp} XP
          </span>
        </div>

        {/* XP bar */}
        <div className="h-1.5 bg-carbon-layer-02 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${flash ? 'bg-carbon-xp-gold' : 'bg-carbon-brand'}`}
            style={{ width: `${barPct}%` }}
          />
        </div>

        {nextLevelXp ? (
          <p className="font-mono text-xs text-carbon-text-placeholder">
            {nextLevelXp - xp} XP to next level
          </p>
        ) : (
          <p className="text-xs text-carbon-xp-gold font-medium">Max level reached ✦</p>
        )}
      </div>
    </aside>
  )
}
