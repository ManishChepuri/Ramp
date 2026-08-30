const TYPE_STYLES = {
  xp:      'border-carbon-warning/30 bg-carbon-warning-bg text-carbon-warning',
  badge:   'border-carbon-brand/30   bg-carbon-brand/10   text-carbon-brand',
  quest:   'border-carbon-quest/30   bg-carbon-quest-bg   text-carbon-quest',
  error:   'border-carbon-error/30   bg-carbon-error-bg   text-carbon-error',
  info:    'border-carbon-border     bg-carbon-layer-01   text-carbon-text-secondary',
}

function Toast({ toast, onRemove }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded border text-sm animate-fade-up max-w-xs ${TYPE_STYLES[toast.type] ?? TYPE_STYLES.info}`}
    >
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="opacity-60 hover:opacity-100 leading-none">×</button>
    </div>
  )
}

export default function ToastContainer({ toasts, removeToast }) {
  if (!toasts?.length) return null
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {toasts.map(t => <Toast key={t.id} toast={t} onRemove={removeToast} />)}
    </div>
  )
}
