import { useEffect, useState } from 'react'

// path -> { content, language } ; survives tab switches within a session
const cache = new Map()

/**
 * Load one source file from the cloned repo for the integrated IDE.
 * `enabled === false` skips the fetch (e.g. no repo checkout available).
 * Returns { content, language, loading, error }.
 */
export function useRepoFile(path, enabled = true) {
  const [state, setState] = useState(() => {
    if (path && cache.has(path)) return { ...cache.get(path), loading: false, error: null }
    return { content: '', language: 'plaintext', loading: !!path, error: null }
  })

  useEffect(() => {
    if (!path || !enabled) return
    if (cache.has(path)) {
      setState({ ...cache.get(path), loading: false, error: null })
      return
    }
    let alive = true
    setState(s => ({ ...s, loading: true, error: null }))
    fetch(`/api/repo/file?path=${encodeURIComponent(path)}`)
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || `Could not load ${path} (${r.status})`)
        return body
      })
      .then(({ content, language, truncated }) => {
        const entry = { content, language, truncated: !!truncated }
        cache.set(path, entry)
        if (alive) setState({ ...entry, loading: false, error: null })
      })
      .catch(err => { if (alive) setState({ content: '', language: 'plaintext', loading: false, error: err.message }) })
    return () => { alive = false }
  }, [path, enabled])

  return state
}
