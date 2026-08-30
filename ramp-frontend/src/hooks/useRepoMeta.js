import { useEffect, useState } from 'react'

let cache = null

/**
 * Whether Ramp has a real repository checkout to serve source from.
 * False when running against only the fixture manifest (no `ramp generate` yet).
 */
export function useRepoMeta() {
  const [meta, setMeta] = useState(cache ?? { available: null, name: null })
  const loading = meta.available === null

  useEffect(() => {
    if (cache) return
    let alive = true
    fetch('/api/repo/meta')
      .then(r => (r.ok ? r.json() : { available: false, name: null }))
      .then(m => { cache = m; if (alive) setMeta(m) })
      .catch(() => { const m = { available: false, name: null }; cache = m; if (alive) setMeta(m) })
    return () => { alive = false }
  }, [])

  return { ...meta, loading }
}
