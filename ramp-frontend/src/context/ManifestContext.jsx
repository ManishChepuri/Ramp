import { createContext, useContext, useState, useEffect } from 'react'

const ManifestContext = createContext(null)

export function ManifestProvider({ children }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/manifest')
      .then(r => r.json())
      .then(json => { setData(json); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <ManifestContext.Provider value={{ manifest: data, loading }}>
      {children}
    </ManifestContext.Provider>
  )
}

export function useManifest() {
  return useContext(ManifestContext)
}
