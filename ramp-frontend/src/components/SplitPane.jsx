import { useRef, useState } from 'react'

/**
 * Two panes with a draggable vertical divider. Left/right widths are a
 * percentage split, clamped and remembered per `storageKey`. Below the `lg`
 * breakpoint it stacks vertically (no divider).
 *
 *   <SplitPane storageKey="ramp.split.module" left={<Docs/>} right={<Editor/>} />
 */
export default function SplitPane({
  left,
  right,
  storageKey,
  defaultPct = 42,
  minPct = 26,
  maxPct = 74,
}) {
  const [pct, setPct] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey))
      if (saved >= minPct && saved <= maxPct) return saved
    } catch { /* private mode */ }
    return defaultPct
  })
  const [dragging, setDragging] = useState(false)
  const wrapRef = useRef(null)

  function startDrag(e) {
    e.preventDefault()
    const wrap = wrapRef.current
    if (!wrap) return
    setDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev) => {
      const r = wrap.getBoundingClientRect()
      let next = ((ev.clientX - r.left) / r.width) * 100
      next = Math.max(minPct, Math.min(maxPct, next))
      setPct(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setDragging(false)
      setPct((p) => {
        try { localStorage.setItem(storageKey, String(Math.round(p))) } catch { /* ignore */ }
        return p
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const paneBusy = dragging ? 'pointer-events-none select-none' : ''

  return (
    <>
      {/* Stacked — small screens */}
      <div className="flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto lg:hidden">
        <div>{left}</div>
        <div className="min-h-[440px]">{right}</div>
      </div>

      {/* Split — lg and up */}
      <div ref={wrapRef} className="hidden lg:flex flex-1 min-h-0 items-stretch">
        <div className={`min-w-0 overflow-y-auto pr-4 ${paneBusy}`} style={{ width: `${pct}%` }}>
          {left}
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          onPointerDown={startDrag}
          onDoubleClick={() => { setPct(defaultPct); try { localStorage.setItem(storageKey, String(defaultPct)) } catch { /* ignore */ } }}
          className="group relative w-3 shrink-0 cursor-col-resize flex items-center justify-center"
        >
          {/* wide invisible hit area */}
          <span className="absolute inset-y-0 -left-2 -right-2" />
          <span className="w-px h-full bg-carbon-border group-hover:bg-carbon-interactive transition-colors" />
          <span
            className={`absolute h-9 w-1 rounded-full transition-colors ${
              dragging ? 'bg-carbon-interactive' : 'bg-carbon-border-strong group-hover:bg-carbon-interactive'
            }`}
          />
        </div>

        <div className={`min-w-0 pl-4 ${paneBusy}`} style={{ width: `${100 - pct}%` }}>
          {right}
        </div>
      </div>
    </>
  )
}
