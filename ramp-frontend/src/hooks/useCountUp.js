import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from its previous value to the new value.
 * Returns the current display value.
 */
export function useCountUp(target, duration = 600) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)

  useEffect(() => {
    if (prev.current === target) return
    const start  = prev.current
    const diff   = target - start
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out quad
      const eased = 1 - (1 - progress) ** 2
      setDisplay(Math.round(start + diff * eased))
      if (progress < 1) requestAnimationFrame(tick)
      else prev.current = target
    }

    requestAnimationFrame(tick)
  }, [target, duration])

  return display
}
