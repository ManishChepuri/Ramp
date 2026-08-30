import { createContext, useContext, useState, useEffect } from 'react'
import manifest from '../fixtures/sample-manifest.json'

const ManifestContext = createContext(null)

export function ManifestProvider({ children }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Point at fixture for now; swap to /api/manifest after Sync 3
    setData(manifest)
    setLoading(false)
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
