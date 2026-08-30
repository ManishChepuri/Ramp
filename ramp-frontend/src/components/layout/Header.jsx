import { useLocation } from 'react-router-dom'
import { useManifest } from '../../context/ManifestContext'

const TITLES = {
  '/':        'Dashboard',
  '/modules': 'Modules',
  '/quests':  'Quest Board',
  '/drift':   'Doc Drift',
  '/impact':  'Impact',
}

export default function Header() {
  const { pathname } = useLocation()
  const { manifest }  = useManifest()

  const base  = '/' + pathname.split('/')[1]
  const title = TITLES[base] ?? 'Ramp'
  const repo  = manifest?.repo

  return (
    <header className="h-12 flex-shrink-0 flex items-center justify-between px-6 bg-carbon-layer-01 border-b border-carbon-border">
      <h1 className="text-sm font-semibold text-carbon-text-primary tracking-wide">{title}</h1>
      {repo && (
        <div className="flex items-center gap-2 bg-carbon-layer-02 border border-carbon-border rounded px-3 py-1">
          <span className="text-carbon-text-placeholder text-xs">repo</span>
          <span className="font-mono text-xs text-carbon-text-secondary">{repo.name}</span>
          <span className="font-mono text-xs text-carbon-text-placeholder">#{repo.commit}</span>
        </div>
      )}
    </header>
  )
}
