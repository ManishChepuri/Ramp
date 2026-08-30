import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header  from './Header'
import XpWidget from './XpWidget'
import ToastContainer from '../ui/ToastContainer'
import Bob from '../Bob'
import LevelLadder from '../LevelLadder'
import LevelUpModal from '../LevelUpModal'
import { useProgress } from '../../context/ProgressContext'
import { hexA } from '../../lib/levels'

const STORE_KEY = 'ramp.sidebar'

export default function AppShell({ toasts, removeToast }) {
  const { level, levelName, levelAccent } = useProgress()
  const [ladderAnchor, setLadderAnchor] = useState(null)
  const openLadder = (e) => setLadderAnchor(e.currentTarget.getBoundingClientRect())
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORE_KEY) === 'collapsed' } catch { return false }
  })

  const toggle = () => setCollapsed(prev => {
    const next = !prev
    try { localStorage.setItem(STORE_KEY, next ? 'collapsed' : 'open') } catch { /* private mode */ }
    return next
  })

  return (
    <div className="flex h-full bg-carbon-bg text-carbon-text-primary font-sans">
      <Sidebar collapsed={collapsed} onOpenLadder={openLadder} />

      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Collapse / expand toggle — a notch recessed into the sidebar's inner
          edge when open (rounded on the content side, right edge = the sidebar
          border); a small pull-tab at the screen edge when collapsed. Centred. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Show navigation' : 'Hide navigation'}
        title={collapsed ? 'Show navigation' : 'Hide navigation'}
        className={`fixed z-30 -translate-y-1/2 w-5 h-12 flex items-center justify-center
                   border-carbon-border bg-carbon-layer-02 text-carbon-text-placeholder
                   hover:text-carbon-interactive hover:border-carbon-interactive
                   transition-[left,color,border-color] duration-200 ${
          collapsed
            ? 'rounded-r-md border-y border-r border-l-0'
            : 'rounded-l-md border-y border-l border-r-0'
        }`}
        style={{ left: collapsed ? '0' : 'calc(15rem - 1.25rem)', top: '50%' }}
      >
        <svg
          width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"
          className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
        >
          <path d="M7.5 2.5 L4 6 l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* When the sidebar is closed, the mascot + level/XP readout keep living — as a floating stack */}
      {collapsed && (
        <div className="fixed bottom-4 left-4 z-30 flex flex-col items-start gap-2 animate-fade-up">
          <button
            type="button"
            onClick={openLadder}
            aria-label={`${levelName}. View level progression.`}
            className="rounded-xl border bg-carbon-layer-01 p-1.5 shadow-xl transition-all hover:brightness-110"
            style={{ borderColor: hexA(levelAccent, 0.4) }}
          >
            <span className="flex h-12 w-12 items-end justify-center">
              <Bob index={level} px={46} />
            </span>
          </button>
          <div className="w-52 bg-carbon-layer-01 border border-carbon-border rounded-lg p-4 shadow-xl">
            <XpWidget />
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <LevelLadder anchorRect={ladderAnchor} onClose={() => setLadderAnchor(null)} />
      <LevelUpModal />
    </div>
  )
}
