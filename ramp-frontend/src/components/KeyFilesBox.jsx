import { useState } from 'react'

function basename(p) {
  return (p || '').split('/').pop() || p
}

/**
 * Collapsible list of a module's key files. Each row is a button that opens
 * the file in the integrated IDE (via `onOpen`). The active file is highlighted.
 *
 * Props:
 *   files      string[]
 *   activePath string | null
 *   onOpen     (path) => void
 *   disabled   boolean         no repo checkout — rows are inert, shows a note
 *   title      string
 */
export default function KeyFilesBox({ files = [], activePath, onOpen, disabled = false, title = 'Key Files' }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-carbon-text-primary hover:bg-carbon-layer-02 transition-colors"
      >
        <span>{title} <span className="text-carbon-text-placeholder font-normal">· {files.length}</span></span>
        <span className="text-carbon-text-placeholder">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {disabled && (
            <p className="px-4 py-2 text-[11px] text-carbon-text-placeholder bg-carbon-layer-02 border-t border-carbon-border">
              Run <code className="text-carbon-interactive">ramp generate</code> to open these in the editor.
            </p>
          )}
          <ul className="divide-y divide-carbon-border">
            {files.map(f => {
              const isActive = f === activePath
              return (
                <li key={f}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onOpen?.(f)}
                    title={f}
                    className={`w-full text-left px-4 py-2 font-mono text-xs flex items-center gap-2 transition-colors ${
                      isActive
                        ? 'bg-carbon-brand/10 text-carbon-interactive'
                        : 'bg-carbon-layer-02 text-carbon-text-secondary hover:text-carbon-interactive disabled:hover:text-carbon-text-secondary disabled:cursor-default'
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 opacity-70">
                      <path d="M9 1H3.5A1.5 1.5 0 002 2.5v11A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V6L9 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      <path d="M9 1v5h5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                    <span className="truncate">{basename(f)}</span>
                    <span className="text-carbon-text-placeholder truncate hidden sm:inline">{f.replace(/[^/]+$/, '')}</span>
                  </button>
                </li>
              )
            })}
            {files.length === 0 && (
              <li className="px-4 py-3 text-xs text-carbon-text-placeholder bg-carbon-layer-02">No key files listed.</li>
            )}
          </ul>
        </>
      )}
    </div>
  )
}
