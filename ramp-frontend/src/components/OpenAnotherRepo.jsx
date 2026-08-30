import { useState } from 'react'
import { useManifest } from '../context/ManifestContext'

const STORE_KEY = 'ramp_openRepoCard'

function CopyRow({ cmd }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(cmd).then(done, done)
    else done()
  }
  return (
    <div className="flex items-center gap-2 bg-carbon-bg border border-carbon-border rounded px-2.5 py-2 font-mono text-xs text-carbon-text-primary overflow-x-auto">
      <span className="text-carbon-text-placeholder select-none">$</span>
      <span className="whitespace-nowrap">{cmd}</span>
      <button
        type="button"
        onClick={copy}
        className={`ml-auto flex-shrink-0 font-mono text-[10px] tracking-wide border rounded px-1.5 py-0.5 transition-colors ${
          copied
            ? 'text-carbon-success border-carbon-success/40'
            : 'text-carbon-text-secondary border-carbon-border hover:text-carbon-text-primary'
        }`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

/**
 * Dashboard card: the exact terminal commands to point Ramp at another repo.
 * Expanded on a user's first visit, then remembers their last open/closed choice.
 */
export default function OpenAnotherRepo() {
  const { manifest } = useManifest()
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(STORE_KEY) !== 'closed' } catch { return true }
  })

  const toggle = () => setOpen(prev => {
    const nextOpen = !prev
    try { localStorage.setItem(STORE_KEY, nextOpen ? 'open' : 'closed') } catch { /* private mode */ }
    return nextOpen
  })

  return (
    <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-sm font-semibold text-carbon-text-primary hover:bg-carbon-layer-02 transition-colors"
      >
        <span>Open Ramp for another repo</span>
        <span className="text-carbon-text-placeholder text-xs">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-3 space-y-3 border-t border-carbon-border">
          <p className="text-sm text-carbon-text-secondary leading-relaxed">
            Point Ramp at any GitHub URL or local path. Generation and serving are two steps, so a
            repo whose curriculum already exists opens instantly.
          </p>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-carbon-text-placeholder mb-1.5">1 &middot; Generate the curriculum</p>
              <CopyRow cmd="node cli/index.js generate https://github.com/OWNER/REPO" />
            </div>
            <div>
              <p className="text-xs text-carbon-text-placeholder mb-1.5">2 &middot; Open the app for it</p>
              <CopyRow cmd="node cli/index.js open" />
            </div>
            <p className="text-xs text-carbon-text-placeholder">
              3 &middot; Work through the modules here in the browser.
            </p>
          </div>

          <p className="font-mono text-[10px] text-carbon-text-placeholder leading-relaxed">
            one-shot: <span className="text-carbon-text-secondary">node cli/index.js &lt;repo&gt;</span>
            {'  ·  '}
            <span className="text-carbon-text-secondary">open</span> with no argument reopens your last repo
            {'  ·  '}
            a local path works too
          </p>

          {manifest?.repo?.name && (
            <p className="text-xs text-carbon-text-placeholder">
              This curriculum was generated from{' '}
              <span className="font-mono text-carbon-interactive">{manifest.repo.name}</span>.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
