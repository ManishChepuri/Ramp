import { useProgress } from '../../context/ProgressContext'
import { LEVELS } from '../../lib/levels'

const TYPE_STYLES = {
  xp:      'border-carbon-warning/30 bg-carbon-warning-bg text-carbon-warning',
  badge:   'border-carbon-brand/30   bg-carbon-brand/10   text-carbon-brand',
  quest:   'border-carbon-quest/30   bg-carbon-quest-bg   text-carbon-quest',
  error:   'border-carbon-error/30   bg-carbon-error-bg   text-carbon-error',
  info:    'border-carbon-border     bg-carbon-layer-01   text-carbon-text-secondary',
}

function Toast({ toast, onRemove }) {
  const { xp, level, nextLevelXp, prevLevelXp } = useProgress()

  const showProgress = toast.type === 'xp' && nextLevelXp != null
  const pct = showProgress
    ? Math.round(((xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100)
    : 0
  const accent = LEVELS[level].accent
  const nextName = LEVELS[level + 1]?.name

  return (
    <div
      className={`rounded border text-sm animate-fade-up max-w-xs px-4 py-3 ${TYPE_STYLES[toast.type] ?? TYPE_STYLES.info}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex-1">{toast.message}</span>
        <button onClick={() => onRemove(toast.id)} className="opacity-60 hover:opacity-100 leading-none">×</button>
      </div>
      {showProgress && (
        <div className="mt-2">
          <div className="h-1 rounded-full bg-carbon-layer-02 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(4, pct)}%`, background: accent }}
            />
          </div>
          <p className="mt-1 font-mono text-[10px] text-carbon-text-placeholder">
            {nextName ? `${nextLevelXp - xp} XP to ${nextName}` : 'Max level reached'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function ToastContainer({ toasts, removeToast }) {
  if (!toasts?.length) return null
  return (
    <div className="fixed bottom-24 right-6 flex flex-col gap-2 z-50">
      {toasts.map(t => <Toast key={t.id} toast={t} onRemove={removeToast} />)}
    </div>
  )
}
