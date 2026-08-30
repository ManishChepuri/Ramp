import { NavLink } from 'react-router-dom'
import XpWidget from './XpWidget'
import Bob from '../Bob'
import { useProgress } from '../../context/ProgressContext'
import { LEVELS, hexA } from '../../lib/levels'

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

export default function Sidebar({ collapsed = false, onOpenLadder }) {
  const { level, levelName, levelAccent } = useProgress()

  return (
    <aside
      className={`flex-shrink-0 bg-carbon-layer-01 flex flex-col h-full select-none overflow-hidden transition-[width] duration-200 ${
        collapsed ? 'w-0 border-r-0' : 'w-60 border-r border-carbon-border'
      }`}
    >
      {/* Wordmark — "Ascent": steps resolving into a smooth ramp, then launch */}
      <div className="h-12 flex items-center px-5 border-b border-carbon-border gap-2">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="flex-shrink-0" aria-hidden="true">
          <path d="M4 25 L12 25 L12 18" stroke="#6f6f76" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
          <path d="M4 25 C 12 25, 16 21, 28 6" stroke="#4589ff" strokeWidth="3.4" strokeLinecap="round"/>
          <circle cx="28" cy="6" r="3.1" fill="#4589ff"/>
        </svg>
        <span className="font-medium text-base tracking-tight text-carbon-text-primary lowercase">ramp</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 stagger-in">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm rounded transition-all duration-150 ${
                isActive
                  ? 'bg-carbon-layer-02 text-carbon-text-primary font-semibold'
                  : 'text-carbon-text-secondary hover:bg-carbon-layer-02 hover:text-carbon-text-primary hover:translate-x-0.5'
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

      {/* Level mascot — click to open the full level ladder */}
      <div className="w-60 flex-shrink-0 px-4 pt-4">
        <button
          type="button"
          onClick={onOpenLadder}
          aria-label={`${levelName} — level ${level + 1} of ${LEVELS.length}. View level progression.`}
          className="group flex w-full items-center gap-3 rounded-xl border bg-carbon-layer-02 p-2.5 text-left transition-all duration-150 hover:brightness-110"
          style={{ borderColor: hexA(levelAccent, 0.4) }}
        >
          <span className="flex h-16 w-16 flex-shrink-0 items-end justify-center rounded-lg bg-carbon-layer-01">
            <Bob index={level} px={58} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold" style={{ color: levelAccent }}>
              {levelName}
            </span>
            <span className="block font-mono text-[10px] text-carbon-text-placeholder">
              Level {level + 1} of {LEVELS.length}
            </span>
            <span className="mt-1 block text-[11px] text-carbon-text-secondary group-hover:text-carbon-text-primary">
              View level map →
            </span>
          </span>
        </button>
      </div>

      {/* XP Widget — tinted with the current level's accent */}
      <div className="p-4 w-60 flex-shrink-0">
        <XpWidget />
      </div>
    </aside>
  )
}
