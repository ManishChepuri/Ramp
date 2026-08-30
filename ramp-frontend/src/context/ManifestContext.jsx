import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ManifestContext = createContext(null)

export function ManifestProvider({ children }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch('/api/manifest')
      .then(r => {
        if (!r.ok) throw new Error(`Manifest request failed: ${r.status}`)
        return r.json()
      })
      .then(json => { setData(json); setLoading(false) })
      .catch(err => { setError(err.message || 'Failed to load manifest'); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <ManifestContext.Provider value={{ manifest: data, loading, error, reload: load }}>
      {children}
    </ManifestContext.Provider>
  )
}

export function useManifest() {
  return useContext(ManifestContext)
}
