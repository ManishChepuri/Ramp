import { useEffect } from 'react'
import { LEVELS, hexA } from '../lib/levels'
import { useProgress } from '../context/ProgressContext'
import Bob from './Bob'

/**
 * The full level progression. Rendered as a panel that expands out of the
 * sidebar mascot card (anchored to whatever element was clicked). Every stage
 * is drawn with its Bob character: levels you've reached are in colour, the
 * ones ahead are greyed out.
 *
 * @param {DOMRect|null} anchorRect  bounding rect of the trigger; null = closed.
 * @param {() => void}   onClose
 */
export default function LevelLadder({ anchorRect, onClose }) {
  const { level: currentIdx, xp } = useProgress()

  const open = !!anchorRect

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
    }
  }, [open, onClose])

  if (!open) return null

  const GAP = 10
  const left = Math.max(8, anchorRect.left)
  const bottom = Math.max(8, window.innerHeight - anchorRect.top + GAP)
  const maxHeight = Math.max(220, anchorRect.top - 16)

  return (
    <>
      {/* click-away catcher */}
      <div className="fixed inset-0 z-[60]" onClick={onClose} aria-hidden="true" />

      <div
        className="ladder-expand fixed z-[61] flex flex-col rounded-2xl border border-carbon-border bg-carbon-layer-01 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Level progression"
        style={{
          left,
          bottom,
          width: 'min(340px, calc(100vw - 16px))',
          maxHeight,
          transformOrigin: 'bottom left',
        }}
      >
        <div className="flex items-center justify-between border-b border-carbon-border px-4 py-2.5">
          <div>
            <h2 className="text-sm font-semibold text-carbon-text-primary">Your climb</h2>
            <p className="font-mono text-[11px] text-carbon-text-placeholder">{xp} XP earned</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-carbon-text-placeholder transition-colors hover:bg-carbon-layer-02 hover:text-carbon-text-primary"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <ol className="space-y-1.5 overflow-y-auto p-3">
          {LEVELS.map((lvl, i) => {
            const reached = i <= currentIdx
            const isCurrent = i === currentIdx
            return (
              <li
                key={lvl.key}
                className="flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors"
                style={{
                  borderColor: isCurrent ? hexA(lvl.accent, 0.55) : '#393939',
                  background: isCurrent ? hexA(lvl.accent, 0.09) : 'transparent',
                }}
              >
                <div className="flex h-14 w-14 flex-shrink-0 items-end justify-center">
                  <Bob index={i} px={52} animate={isCurrent} dim={!reached} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: reached ? lvl.accent : '#6f6f76' }}
                    >
                      {lvl.name}
                    </span>
                    <span className="font-mono text-[11px] text-carbon-text-placeholder">
                      {lvl.xp} XP
                    </span>
                    {isCurrent && (
                      <span
                        className="ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] font-medium"
                        style={{ background: hexA(lvl.accent, 0.16), color: lvl.accent }}
                      >
                        you are here
                      </span>
                    )}
                    {!reached && (
                      <svg className="ml-auto flex-shrink-0" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <rect x="2.5" y="5.5" width="7" height="5" rx="1" fill="none" stroke="#6f6f76" strokeWidth="1.2" />
                        <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="#6f6f76" strokeWidth="1.2" />
                      </svg>
                    )}
                  </div>
                  <p
                    className="mt-0.5 text-xs"
                    style={{ color: reached ? '#a8a8a8' : '#525252' }}
                  >
                    {lvl.blurb}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}
