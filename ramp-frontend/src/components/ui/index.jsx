// Shared UI primitives — fully polished

// ── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ pct = 0, label, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-carbon-text-secondary">{label}</span>
          <span className="font-mono text-xs font-semibold text-carbon-text-primary">{pct}%</span>
        </div>
      )}
      <div className="h-2 bg-carbon-layer-02 rounded-full overflow-hidden">
        <div
          className="h-full bg-carbon-brand rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ── Skeleton shimmer block ───────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton-shimmer rounded ${className}`} aria-hidden="true" />
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, heading, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-carbon-border rounded-lg gap-3">
      {icon && <span className="text-3xl text-carbon-text-placeholder" aria-hidden="true">{icon}</span>}
      <p className="text-sm font-semibold text-carbon-text-secondary">{heading}</p>
      {body && <p className="text-xs text-carbon-text-placeholder max-w-xs leading-relaxed">{body}</p>}
      {action}
    </div>
  )
}

// ── Risk / complexity badge pill ─────────────────────────────────────────────
const LEVEL_COLORS = {
  high:   'bg-carbon-error-bg   text-carbon-error   border-carbon-error/30',
  medium: 'bg-carbon-warning-bg text-carbon-warning border-carbon-warning/30',
  low:    'bg-carbon-success-bg text-carbon-success border-carbon-success/30',
}

export function RiskBadge({ level }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold border tracking-wide ${LEVEL_COLORS[level] ?? LEVEL_COLORS.low}`}>
      {level?.toUpperCase()} RISK
    </span>
  )
}

export function ComplexityBadge({ level }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold border tracking-wide ${LEVEL_COLORS[level] ?? LEVEL_COLORS.low}`}>
      {level?.toUpperCase()}
    </span>
  )
}

// ── Severity badge ───────────────────────────────────────────────────────────
const SEV_COLORS = {
  high:   'bg-carbon-error-bg  text-carbon-error   border-carbon-error/30',
  medium: 'bg-carbon-drift-bg  text-carbon-drift   border-carbon-drift/30',
  low:    'bg-carbon-layer-02  text-carbon-text-secondary border-carbon-border',
}
export function SeverityBadge({ level }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold border tracking-wide ${SEV_COLORS[level] ?? SEV_COLORS.low}`}>
      {level?.toUpperCase()}
    </span>
  )
}

// ── Certification chip ───────────────────────────────────────────────────────
export function CertificationChip({ status = 'locked' }) {
  const variants = {
    certified:    { cls: 'bg-carbon-brand/10 text-carbon-brand border-carbon-brand/30',              label: '✓ Certified'    },
    'in-progress':{ cls: 'bg-carbon-layer-02 text-carbon-text-secondary border-carbon-border',       label: '● In Progress'  },
    locked:       { cls: 'bg-carbon-layer-02 text-carbon-text-placeholder border-carbon-border',     label: '🔒 Locked'      },
  }
  const v = variants[status] ?? variants.locked
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-semibold border ${v.cls}`}>
      {v.label}
    </span>
  )
}

// ── XP chip ──────────────────────────────────────────────────────────────────
export function XpChip({ xp }) {
  return (
    <span className="font-mono text-xs font-bold text-carbon-xp-gold bg-carbon-warning-bg border border-carbon-warning/20 px-2 py-0.5 rounded-sm whitespace-nowrap">
      +{xp} XP
    </span>
  )
}

// ── Difficulty badge ─────────────────────────────────────────────────────────
const DIFF_COLORS = {
  easy:   'text-carbon-success bg-carbon-success-bg border-carbon-success/20',
  medium: 'text-carbon-warning bg-carbon-warning-bg border-carbon-warning/20',
  hard:   'text-carbon-error   bg-carbon-error-bg   border-carbon-error/20',
}
export function DifficultyBadge({ level }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold border ${DIFF_COLORS[level] ?? DIFF_COLORS.easy}`}>
      {level?.charAt(0).toUpperCase() + level?.slice(1)}
    </span>
  )
}

// ── Loading spinner ──────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4 border-2' : size === 'lg' ? 'w-12 h-12 border-[3px]' : 'w-8 h-8 border-2'
  return (
    <div className={`${s} border-carbon-layer-02 border-t-carbon-brand rounded-full animate-spin`} role="status" aria-label="Loading" />
  )
}

// ── Page-level loading state ─────────────────────────────────────────────────
export function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-carbon-text-placeholder">Loading…</p>
    </div>
  )
}

// ── Button variants ──────────────────────────────────────────────────────────
export function PrimaryButton({ children, onClick, disabled, className = '', loading = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-carbon-brand text-white text-sm font-medium rounded
        hover:bg-carbon-interactive-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150
        hover:-translate-y-px active:scale-[0.97] ${className}`}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 border border-carbon-interactive text-carbon-interactive text-sm font-medium rounded
        hover:bg-carbon-interactive/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150
        hover:-translate-y-px active:scale-[0.97] ${className}`}
    >
      {children}
    </button>
  )
}

export function SubtleButton({ children, onClick, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-1.5 border border-carbon-border text-carbon-text-secondary text-xs font-medium rounded
        hover:bg-carbon-layer-02 hover:text-carbon-text-primary disabled:opacity-40 transition-all duration-150
        active:scale-[0.97] ${className}`}
    >
      {children}
    </button>
  )
}
