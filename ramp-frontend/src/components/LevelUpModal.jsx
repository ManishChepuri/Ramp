import { useEffect, useRef } from 'react'
import { useProgress } from '../context/ProgressContext'
import { LEVELS, hexA } from '../lib/levels'
import Bob from './Bob'

const DISMISS_MS = 4200

// Small radial spark burst on a canvas. Self-terminates; returns a canceller.
function runConfetti(canvas, color) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const W = canvas.width
  const H = canvas.height
  const parts = Array.from({ length: 44 }, () => {
    const a = Math.random() * Math.PI * 2
    const sp = 3 + Math.random() * 5
    return { x: W / 2, y: H / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, life: 1, r: 1.5 + Math.random() * 2.5 }
  })
  let raf = 0
  let last = performance.now()
  const frame = (t) => {
    const dt = Math.min((t - last) / 16.7, 3)
    last = t
    ctx.clearRect(0, 0, W, H)
    let alive = false
    for (const p of parts) {
      p.vy += 0.12 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= 0.012 * dt
      if (p.life > 0) {
        alive = true
        ctx.globalAlpha = Math.max(p.life, 0)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, 7)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    if (alive) raf = requestAnimationFrame(frame)
    else ctx.clearRect(0, 0, W, H)
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}

export default function LevelUpModal() {
  const { levelUp, dismissLevelUp } = useProgress()
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!levelUp) return undefined
    const timer = setTimeout(dismissLevelUp, DISMISS_MS)
    const onKey = (e) => { if (e.key === 'Escape') dismissLevelUp() }
    window.addEventListener('keydown', onKey)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cancelConfetti = !reduce && canvasRef.current
      ? runConfetti(canvasRef.current, LEVELS[levelUp.toIdx].accent)
      : () => {}

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
      cancelConfetti()
    }
  }, [levelUp, dismissLevelUp])

  if (!levelUp) return null

  const from = LEVELS[levelUp.fromIdx]
  const to = LEVELS[levelUp.toIdx]
  const after = LEVELS[levelUp.toIdx + 1]

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-carbon-bg/75 backdrop-blur-sm animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label={`Level up: you are now ${to.name}`}
      onClick={dismissLevelUp}
    >
      <div
        className="levelup-pop relative w-[min(90vw,340px)] rounded-2xl border bg-carbon-layer-01 p-8 text-center"
        style={{ borderColor: hexA(to.accent, 0.45) }}
        onClick={(e) => e.stopPropagation()}
      >
        <canvas
          ref={canvasRef}
          width="420"
          height="420"
          className="pointer-events-none absolute -inset-10 h-[calc(100%+80px)] w-[calc(100%+80px)]"
          aria-hidden="true"
        />
        <p className="font-mono text-xs font-medium uppercase tracking-[0.16em]" style={{ color: to.accent }}>
          Level up
        </p>

        <div className="my-3 flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center overflow-visible rounded-xl border bg-carbon-layer-02"
            style={{ borderColor: hexA(to.accent, 0.4) }}
          >
            <Bob index={levelUp.toIdx} px={46} color={to.accent} />
          </div>
        </div>

        <p className="font-mono text-sm text-carbon-text-placeholder">
          <span className="text-carbon-text-primary font-medium">{from.name}</span>
          {' → '}
          <span className="text-carbon-text-primary font-medium">{to.name}</span>
        </p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight" style={{ color: to.accent }}>{to.name}</p>
        <p className="mt-1 text-sm text-carbon-text-secondary">{to.blurb}</p>
        <p className="mt-4 font-mono text-[11px] text-carbon-text-placeholder">
          {after ? `next: ${after.name} at ${after.xp} XP` : 'Top of the ladder — nothing left to climb.'}
        </p>
      </div>
    </div>
  )
}
