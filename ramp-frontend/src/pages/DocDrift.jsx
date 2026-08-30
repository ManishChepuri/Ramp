import { useState, useMemo } from 'react'
import { useManifest }  from '../context/ManifestContext'
import { useProgress }  from '../context/ProgressContext'
import { SeverityBadge, EmptyState } from '../components/ui/index'

const XP_BY_SEVERITY = { high: 25, medium: 15, low: 10 }
const xpFor = s => XP_BY_SEVERITY[s] ?? 10

const basename = p => (p || '').split('/').pop() || p

function defaultCommitMessage(item) {
  const summary = (item.suggestedCorrection || '').replace(/\s+/g, ' ').trim().slice(0, 68)
  return `docs: correct ${basename(item.location)}\n\n${summary}\n\nFlagged by Ramp (${item.id}): the docs contradicted the code.`
}

// ── Copyable command / text row ──────────────────────────────────────────────
function CopyLine({ text, label, mono = true, block = false }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    const flash = () => { setDone(true); setTimeout(() => setDone(false), 1400) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(flash, flash)
    else flash()
  }
  return (
    <div className={`flex items-start gap-2 bg-carbon-bg border border-carbon-border rounded px-2.5 py-2 ${mono ? 'font-mono' : ''} text-xs text-carbon-text-primary`}>
      <span className={`flex-1 min-w-0 ${block ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap overflow-x-auto'}`}>{text}</span>
      <button
        type="button"
        onClick={copy}
        className={`flex-shrink-0 font-mono text-[10px] tracking-wide border rounded px-1.5 py-0.5 transition-colors ${
          done ? 'text-carbon-success border-carbon-success/40' : 'text-carbon-text-secondary border-carbon-border hover:text-carbon-text-primary'
        }`}
      >
        {done ? 'Copied' : (label || 'Copy')}
      </button>
    </div>
  )
}

// ── Unified-diff renderer ───────────────────────────────────────────────────
function DiffView({ diff }) {
  const lines = (diff ?? '').split('\n')
  const added   = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length
  const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length
  return (
    <div>
      <div className="flex items-center gap-3 mb-1.5">
        <span className="font-mono text-[11px] text-carbon-success">+{added}</span>
        <span className="font-mono text-[11px] text-carbon-error">−{removed}</span>
        <span className="font-mono text-[11px] text-carbon-text-placeholder">unified diff</span>
      </div>
      <div className="font-mono text-xs rounded-lg bg-carbon-bg border border-carbon-border overflow-x-auto">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`px-3 py-0.5 leading-relaxed ${
              line.startsWith('+') && !line.startsWith('+++')
                ? 'bg-carbon-success/10 text-carbon-success'
                : line.startsWith('-') && !line.startsWith('---')
                ? 'bg-carbon-error/10 text-carbon-error'
                : line.startsWith('@@')
                ? 'text-carbon-interactive'
                : 'text-carbon-text-secondary'
            }`}
          >
            {line || ' '}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── "Apply this fix" instructions ───────────────────────────────────────────
function ApplyBlock({ item }) {
  function downloadPatch() {
    const body = item.correctionDiff.endsWith('\n') ? item.correctionDiff : item.correctionDiff + '\n'
    const url = URL.createObjectURL(new Blob([body], { type: 'text/x-patch' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${item.id}.patch`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-semibold text-carbon-text-primary uppercase tracking-wider">Apply this fix</h4>

      <div className="flex flex-wrap gap-2">
        <CopyLineButton text={item.correctionDiff} label="Copy diff" />
        <button
          type="button"
          onClick={downloadPatch}
          className="font-mono text-[11px] tracking-wide border border-carbon-border text-carbon-text-secondary hover:text-carbon-text-primary rounded px-2 py-1 transition-colors"
        >
          ↓ Download {item.id}.patch
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] text-carbon-text-placeholder">1 · From your repo root, apply the patch:</p>
        <CopyLine text={`git apply --recount ${item.id}.patch`} />
        <p className="text-[11px] text-carbon-text-placeholder">or, straight from the clipboard after “Copy diff”:</p>
        <CopyLine text={`pbpaste | git apply --recount`} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] text-carbon-text-placeholder">2 · Review, then commit (edit the message to taste):</p>
        <CommitBox item={item} />
      </div>

      <p className="text-[11px] text-carbon-text-placeholder leading-relaxed">
        Prefer to hand-edit? The change is {' '}
        <span className="text-carbon-text-secondary">{diffLineCount(item.correctionDiff)}</span>{' '}
        in <span className="font-mono text-carbon-text-secondary">{item.location}</span> — the diff above shows exactly where.
        {' '}If the patch is rejected because the file changed since generation, try{' '}
        <span className="font-mono text-carbon-text-secondary">git apply --3way {item.id}.patch</span>.
      </p>
    </div>
  )
}

function diffLineCount(diff) {
  const lines = (diff ?? '').split('\n')
  const added   = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length
  const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length
  const parts = []
  if (added) parts.push(`${added} line${added !== 1 ? 's' : ''} added`)
  if (removed) parts.push(`${removed} line${removed !== 1 ? 's' : ''} removed`)
  return parts.join(', ') || 'a small edit'
}

// Copy-a-blob-of-text button (used for the diff, which is multi-line)
function CopyLineButton({ text, label }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    const flash = () => { setDone(true); setTimeout(() => setDone(false), 1400) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(flash, flash)
    else flash()
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={`font-mono text-[11px] tracking-wide border rounded px-2 py-1 transition-colors ${
        done ? 'text-carbon-success border-carbon-success/40' : 'bg-carbon-brand text-white border-carbon-brand hover:bg-carbon-interactive-hover'
      }`}
    >
      {done ? 'Copied ✓' : label}
    </button>
  )
}

function CommitBox({ item }) {
  const [msg, setMsg] = useState(() => defaultCommitMessage(item))
  const [done, setDone] = useState(false)
  const copy = () => {
    const flash = () => { setDone(true); setTimeout(() => setDone(false), 1400) }
    const cmd = `git commit -m "${msg.split('\n')[0].replace(/"/g, '\\"')}"`
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(cmd).then(flash, flash)
    else flash()
  }
  return (
    <div className="space-y-1.5">
      <textarea
        value={msg}
        onChange={e => setMsg(e.target.value)}
        rows={6}
        className="w-full bg-carbon-bg border border-carbon-border rounded p-2.5 text-xs font-mono text-carbon-text-primary focus:border-carbon-interactive focus:outline-none resize-y leading-relaxed"
      />
      <button
        type="button"
        onClick={copy}
        className={`font-mono text-[10px] tracking-wide border rounded px-1.5 py-0.5 transition-colors ${
          done ? 'text-carbon-success border-carbon-success/40' : 'text-carbon-text-secondary border-carbon-border hover:text-carbon-text-primary'
        }`}
      >
        {done ? 'Copied' : 'Copy commit command'}
      </button>
    </div>
  )
}

// ── One finding ─────────────────────────────────────────────────────────────
function DriftCard({ item, status, onConfirm, onDismiss, onReopen, onShip }) {
  const confirmed = status === 'confirmed'
  const dismissed = status === 'dismissed'
  const resolved  = status === 'resolved'

  // Once a finding is confirmed the patch + apply steps are shown inline —
  // no extra click. Still visible (read-only) after it's shipped.
  const showFix = confirmed || resolved

  return (
    <div className={`card-hover bg-carbon-layer-01 border border-carbon-border border-l-4 rounded-lg overflow-hidden ${
      dismissed ? 'border-l-carbon-border opacity-50'
        : resolved ? 'border-l-carbon-success'
        : 'border-l-carbon-drift'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge level={item.severity} />
            {resolved && <span className="text-xs text-carbon-success font-semibold flex items-center gap-1">✓ Shipped</span>}
            {confirmed && <span className="text-xs text-carbon-drift font-semibold flex items-center gap-1">● Confirmed — ready to fix</span>}
            {dismissed && <span className="text-xs text-carbon-text-placeholder font-medium">Dismissed</span>}
          </div>
          <span className="font-mono text-xs text-carbon-text-placeholder flex-shrink-0">{item.location}</span>
        </div>

        {/* Claim vs reality */}
        <div className="space-y-2 mb-4 bg-carbon-layer-02 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <span className="text-xs text-carbon-text-placeholder w-24 flex-shrink-0 mt-0.5 font-medium">Docs claim:</span>
            <p className="text-sm text-carbon-text-secondary italic leading-snug">&ldquo;{item.docClaim}&rdquo;</p>
          </div>
          <div className="border-t border-carbon-border pt-2 flex items-start gap-3">
            <span className="text-xs text-carbon-drift w-24 flex-shrink-0 mt-0.5 font-medium">Code says:</span>
            <p className="text-sm text-carbon-text-primary leading-snug">{item.codeReality}</p>
          </div>
        </div>

        {/* Triage actions */}
        {status === 'pending' && (
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

        {dismissed && (
          <button onClick={onReopen} className="text-xs text-carbon-interactive hover:underline">
            ↺ Reopen finding
          </button>
        )}
      </div>

      {/* The fix — shown once confirmed */}
      {showFix && (
        <div className="border-t border-carbon-border p-4 space-y-4 bg-carbon-layer-02 animate-fade-up">
          {item.suggestedCorrection && (
            <div>
              <h4 className="text-xs font-semibold text-carbon-text-primary uppercase tracking-wider mb-1.5">The fix</h4>
              <p className="text-sm text-carbon-text-secondary leading-relaxed">{item.suggestedCorrection}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-carbon-text-primary uppercase tracking-wider mb-1.5">
              Bob&rsquo;s patch
            </h4>
            <DiffView diff={item.correctionDiff} />
          </div>

          <ApplyBlock item={item} />

          {!resolved && (
            <div className="pt-1">
              <button
                onClick={onShip}
                className="px-4 py-2 text-xs font-semibold bg-carbon-success text-white rounded hover:opacity-90 transition-colors"
              >
                Mark as Shipped &nbsp;·&nbsp; +{xpFor(item.severity)} XP
              </button>
              <p className="text-[11px] text-carbon-text-placeholder mt-1.5">
                Confirms you applied this fix in your checkout. Adds it to your contribution ledger.
              </p>
            </div>
          )}

          {resolved && (
            <p className="text-xs text-carbon-success font-medium">
              ✓ Shipped — logged in your contribution ledger. Re-apply the patch above any time.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function DocDrift({ addToast }) {
  const { manifest }  = useManifest()
  const {
    driftStates, confirmDrift, dismissDrift, reopenDrift, resolveDrift,
    awardXp, awardBadge, addContribution, earnedBadges,
  } = useProgress()

  const items = useMemo(() => manifest?.docDrift ?? [], [manifest])

  const statusOf = id => driftStates[id] ?? 'pending'
  const count = s => items.filter(i => statusOf(i.id) === s).length
  const confirmed = count('confirmed')
  const dismissed = count('dismissed')
  const shipped   = count('resolved')
  const pending   = items.length - confirmed - dismissed - shipped

  function handleConfirm(item) {
    confirmDrift(item.id)
    addToast?.({ message: 'Finding confirmed — Bob’s patch is ready below', type: 'quest' })
    if (!earnedBadges.includes('doc-detective')) {
      awardBadge('doc-detective')
      addToast?.({ message: '🏅 Badge: Doc Detective', type: 'badge' })
    }
  }

  function handleShip(item) {
    resolveDrift(item.id)
    const xp = xpFor(item.severity)
    awardXp(xp)
    addContribution({
      id: `drift-fix-${item.id}`,
      driftId: item.id,
      title: `Doc fix: ${item.location}`,
      type: 'doc-fix',
      xp,
    })
    addToast?.({ message: `Doc fix shipped — +${xp} XP`, type: 'xp' })
    if (!earnedBadges.includes('rent-paid')) {
      awardBadge('rent-paid')
      addToast?.({ message: '🏅 Badge: Rent Paid', type: 'badge' })
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
    <div className="space-y-4 max-w-3xl animate-fade-up stagger-in">
      {/* Summary bar */}
      <div className="card-hover flex items-center gap-6 bg-carbon-layer-01 border border-carbon-border rounded-lg px-5 py-3 flex-wrap">
        <Stat n={items.length} label="findings" tone="text-carbon-text-primary" />
        <Divider />
        <Stat n={pending} label="to review" tone="text-carbon-drift" />
        <Divider />
        <Stat n={confirmed} label="ready to fix" tone="text-carbon-interactive" />
        <Divider />
        <Stat n={shipped} label="shipped" tone="text-carbon-success" />
        <Divider />
        <Stat n={dismissed} label="dismissed" tone="text-carbon-text-placeholder" />
      </div>

      {items.map(item => (
        <DriftCard
          key={item.id}
          item={item}
          status={statusOf(item.id)}
          onConfirm={() => handleConfirm(item)}
          onDismiss={() => dismissDrift(item.id)}
          onReopen={() => reopenDrift(item.id)}
          onShip={() => handleShip(item)}
        />
      ))}
    </div>
  )
}

function Stat({ n, label, tone }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-sm font-bold ${tone}`}>{n}</span>
      <span className="text-xs text-carbon-text-secondary">{label}</span>
    </div>
  )
}
function Divider() {
  return <div className="w-px h-4 bg-carbon-border" />
}
