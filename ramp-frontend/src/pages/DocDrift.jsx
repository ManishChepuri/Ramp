import { useState } from 'react'
import { useManifest }  from '../context/ManifestContext'
import { useProgress }  from '../context/ProgressContext'
import { SeverityBadge, EmptyState } from '../components/ui/index'

function DiffView({ diff }) {
  const lines = (diff ?? '').split('\n')
  return (
    <div className="font-mono text-xs rounded-lg bg-carbon-bg border border-carbon-border overflow-x-auto">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`px-3 py-0.5 leading-relaxed ${
            line.startsWith('+')
              ? 'bg-carbon-success/10 text-carbon-success'
              : line.startsWith('-')
              ? 'bg-carbon-error/10   text-carbon-error'
              : 'text-carbon-text-secondary'
          }`}
        >
          {line || ' '}
        </div>
      ))}
    </div>
  )
}

function DriftCard({ item, status, onConfirm, onDismiss, addToast }) {
  const [expanded, setExpanded] = useState(false)
  const [correction, setCorrection] = useState(item.suggestedCorrection ?? '')
  const [staged, setStaged] = useState(false)

  const confirmed = status === 'confirmed'
  const dismissed = status === 'dismissed'

  return (
    <div className={`bg-carbon-layer-01 border border-carbon-border border-l-4 rounded-lg overflow-hidden transition-opacity ${
      dismissed ? 'border-l-carbon-border opacity-40' : 'border-l-carbon-drift'
    }`}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge level={item.severity} />
            {confirmed && (
              <span className="text-xs text-carbon-success font-semibold flex items-center gap-1">
                ✓ Confirmed
              </span>
            )}
            {dismissed && (
              <span className="text-xs text-carbon-text-placeholder font-medium">Dismissed</span>
            )}
          </div>
          <span className="font-mono text-xs text-carbon-text-placeholder flex-shrink-0">{item.location}</span>
        </div>

        {/* Claim vs reality */}
        <div className="space-y-2 mb-4 bg-carbon-layer-02 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <span className="text-xs text-carbon-text-placeholder w-24 flex-shrink-0 mt-0.5 font-medium">Docs claim:</span>
            <p className="text-sm text-carbon-text-secondary italic leading-snug">"{item.docClaim}"</p>
          </div>
          <div className="border-t border-carbon-border pt-2 flex items-start gap-3">
            <span className="text-xs text-carbon-drift w-24 flex-shrink-0 mt-0.5 font-medium">Code says:</span>
            <p className="text-sm text-carbon-text-primary leading-snug">{item.codeReality}</p>
          </div>
        </div>

        {/* Actions */}
        {!dismissed && !confirmed && (
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 text-xs font-medium bg-carbon-brand text-white rounded hover:bg-carbon-interactive-hover transition-colors"
            >
              Confirm Finding
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-medium border border-carbon-border text-carbon-text-secondary rounded hover:bg-carbon-layer-02 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {confirmed && !staged && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-carbon-interactive hover:underline flex items-center gap-1"
          >
            {expanded ? '▲ Hide correction' : "▼ Review Bob's correction"}
          </button>
        )}
      </div>

      {/* Correction panel */}
      {expanded && confirmed && !staged && (
        <div className="border-t border-carbon-border p-4 space-y-3 bg-carbon-layer-02 animate-fade-up">
          <h4 className="text-xs font-semibold text-carbon-text-primary uppercase tracking-wider">
            Bob's Suggested Correction
          </h4>
          <DiffView diff={item.correctionDiff} />
          <div>
            <label className="text-xs text-carbon-text-placeholder mb-1.5 block">
              Edit before staging — you review it, nothing lands unreviewed:
            </label>
            <textarea
              value={correction}
              onChange={e => setCorrection(e.target.value)}
              rows={5}
              className="w-full bg-carbon-bg border border-carbon-border rounded-lg p-3 text-sm font-mono text-carbon-text-primary focus:border-carbon-interactive focus:outline-none resize-y leading-relaxed"
            />
          </div>
          <button
            onClick={() => {
              setStaged(true)
              setExpanded(false)
              addToast?.({ message: '✓ Correction staged — Rent Paid quest complete', type: 'quest' })
            }}
            className="px-4 py-2 text-xs font-medium bg-carbon-success text-white rounded hover:opacity-90 transition-colors"
          >
            Stage Correction →
          </button>
        </div>
      )}

      {staged && (
        <div className="border-t border-carbon-border px-4 py-2 bg-carbon-success-bg flex items-center gap-2">
          <span className="text-xs text-carbon-success font-semibold">✓ Correction staged for review</span>
        </div>
      )}
    </div>
  )
}

export default function DocDrift({ addToast }) {
  const { manifest }  = useManifest()
  const {
    driftStates, confirmDrift, dismissDrift,
    awardBadge, earnedBadges
  } = useProgress()

  const items      = manifest?.docDrift ?? []
  const confirmed  = items.filter(i => driftStates[i.id] === 'confirmed').length
  const dismissed  = items.filter(i => driftStates[i.id] === 'dismissed').length
  const pending    = items.length - confirmed - dismissed

  function handleConfirm(item) {
    confirmDrift(item.id)
    addToast?.({ message: 'Finding confirmed — doc-fix quest created', type: 'quest' })
    if (!earnedBadges.includes('doc-detective')) {
      awardBadge('doc-detective')
      addToast?.({ message: '🏅 Badge: Doc Detective', type: 'badge' })
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="⚑"
        heading="No documentation drift detected"
        body="Bob found no contradictions between your README/docs and the actual code."
      />
    )
  }

  return (
    <div className="space-y-4 max-w-3xl animate-fade-up">
      {/* Summary bar */}
      <div className="flex items-center gap-6 bg-carbon-layer-01 border border-carbon-border rounded-lg px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-carbon-text-primary">{items.length}</span>
          <span className="text-xs text-carbon-text-secondary">total findings</span>
        </div>
        <div className="w-px h-4 bg-carbon-border" />
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-carbon-success">{confirmed}</span>
          <span className="text-xs text-carbon-text-secondary">confirmed</span>
        </div>
        <div className="w-px h-4 bg-carbon-border" />
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-carbon-text-placeholder">{dismissed}</span>
          <span className="text-xs text-carbon-text-secondary">dismissed</span>
        </div>
        <div className="w-px h-4 bg-carbon-border" />
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-carbon-drift">{pending}</span>
          <span className="text-xs text-carbon-text-secondary">pending</span>
        </div>
      </div>

      {items.map(item => (
        <DriftCard
          key={item.id}
          item={item}
          status={driftStates[item.id] ?? 'pending'}
          onConfirm={() => handleConfirm(item)}
          onDismiss={() => dismissDrift(item.id)}
          addToast={addToast}
        />
      ))}
    </div>
  )
}
