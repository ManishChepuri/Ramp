import { useManifest }  from '../context/ManifestContext'
import { useProgress }  from '../context/ProgressContext'
import { EmptyState }   from '../components/ui/index'
import { useCountUp }   from '../hooks/useCountUp'

function KpiCard({ value, label, unit, muted = false }) {
  const numeric = typeof value === 'number' ? value : null
  const animated = useCountUp(numeric ?? 0)
  const display  = numeric != null ? animated : (value ?? '—')

  return (
    <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-5 space-y-2">
      <div className="flex items-end gap-2">
        <span className="font-mono text-4xl font-bold text-carbon-text-primary leading-none">
          {display}
        </span>
        {unit && <span className="font-mono text-base text-carbon-text-secondary mb-0.5">{unit}</span>}
      </div>
      <p className="text-sm text-carbon-text-secondary">{label}</p>
    </div>
  )
}

export default function Impact() {
  const { manifest }   = useManifest()
  const {
    timeToFirstCert, avgComprehension, docFixesShipped,
    certifications, quizHistory, contributions,
  } = useProgress()

  const modules = manifest?.modules ?? []

  const BASELINE_MANUAL_MINS  = 120
  const BASELINE_CORRECTNESS  = '2 / 5'

  return (
    <div className="space-y-5 max-w-4xl animate-fade-up">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          value={timeToFirstCert}
          unit="min"
          label="Time to First Certification"
        />
        <KpiCard
          value={avgComprehension}
          unit="/100"
          label="Comprehension Score"
        />
        <KpiCard
          value={docFixesShipped}
          label="Doc Fixes Shipped"
        />
      </div>

      {/* Before / After comparison */}
      <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-carbon-border">
          <h3 className="text-sm font-semibold text-carbon-text-primary">Manual Onboarding vs Ramp</h3>
          <p className="text-xs text-carbon-text-placeholder mt-0.5">Head-to-head comparison against a cold manual baseline</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-carbon-border text-xs">
              <th className="text-left px-5 py-2.5 text-carbon-text-placeholder font-medium w-1/3">Metric</th>
              <th className="text-left px-5 py-2.5 text-carbon-text-secondary font-medium w-1/3">Manual</th>
              <th className="text-left px-5 py-2.5 text-carbon-interactive font-medium w-1/3 bg-carbon-brand/5">
                With Ramp ✦
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-carbon-border">
            <tr>
              <td className="px-5 py-3 text-carbon-text-secondary text-xs">Time to understand codebase</td>
              <td className="px-5 py-3 font-mono text-sm text-carbon-text-secondary">{BASELINE_MANUAL_MINS} min</td>
              <td className="px-5 py-3 font-mono text-sm text-carbon-interactive bg-carbon-brand/5">
                {timeToFirstCert != null ? `${timeToFirstCert} min` : 'In progress'}
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-carbon-text-secondary text-xs">Questions answered correctly</td>
              <td className="px-5 py-3 font-mono text-sm text-carbon-text-secondary">{BASELINE_CORRECTNESS}</td>
              <td className="px-5 py-3 font-mono text-sm text-carbon-interactive bg-carbon-brand/5">
                {certifications.length} / {modules.length} certified
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-carbon-text-secondary text-xs">Codebase improvements shipped</td>
              <td className="px-5 py-3 font-mono text-sm text-carbon-text-secondary">0</td>
              <td className="px-5 py-3 font-mono text-sm text-carbon-interactive bg-carbon-brand/5">
                {docFixesShipped}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Module certification progress */}
      <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-carbon-text-primary">Module Certification Progress</h3>
        {modules.length === 0 ? (
          <p className="text-xs text-carbon-text-placeholder">No modules yet.</p>
        ) : (
          modules.map(m => {
            const hist       = quizHistory[m.id]
            const pct        = hist?.pct ?? 0
            const certified  = certifications.includes(m.id)
            return (
              <div key={m.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-carbon-text-secondary">{m.name}</span>
                  <span className={`font-mono text-xs font-semibold ${certified ? 'text-carbon-success' : hist ? 'text-carbon-text-secondary' : 'text-carbon-text-placeholder'}`}>
                    {certified ? '✓ Certified' : hist ? `${pct}%` : 'Not started'}
                  </span>
                </div>
                <div className="h-1.5 bg-carbon-layer-02 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${certified ? 'bg-carbon-success' : 'bg-carbon-brand'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Contribution ledger */}
      <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-carbon-border">
          <h3 className="text-sm font-semibold text-carbon-text-primary">Contribution Ledger</h3>
          <p className="text-xs text-carbon-text-placeholder mt-0.5">Real improvements shipped during onboarding</p>
        </div>
        {contributions.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-xs text-carbon-text-placeholder">
              No contributions yet — complete doc-fix quests to build your ledger.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-carbon-border">
            {contributions.map((c, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-carbon-layer-02 transition-colors">
                <span className="font-mono text-xs text-carbon-text-placeholder w-20 flex-shrink-0">
                  {new Date(c.date).toLocaleDateString()}
                </span>
                <span className="text-sm text-carbon-text-primary flex-1 min-w-0 truncate">{c.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded border font-semibold flex-shrink-0 ${
                  c.type === 'doc-fix'
                    ? 'text-carbon-quest bg-carbon-quest-bg border-carbon-quest/20'
                    : 'text-carbon-interactive bg-carbon-brand/10 border-carbon-interactive/20'
                }`}>
                  {c.type === 'doc-fix' ? 'Doc Fix' : 'Starter'}
                </span>
                <span className="font-mono text-xs font-bold text-carbon-xp-gold flex-shrink-0">+{c.xp} XP</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
