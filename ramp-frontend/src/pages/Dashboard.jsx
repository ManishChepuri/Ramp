import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useManifest }  from '../context/ManifestContext'
import { useProgress }  from '../context/ProgressContext'
import { ProgressBar, SkeletonCard, Skeleton, EmptyState, PrimaryButton } from '../components/ui/index'
import { useCountUp } from '../hooks/useCountUp'

function StatCard({ value, label, accent = false }) {
  const animated = useCountUp(value ?? 0)
  return (
    <div className={`bg-carbon-layer-01 border rounded-lg p-5 flex flex-col gap-2 ${accent ? 'border-carbon-brand/40' : 'border-carbon-border'}`}>
      <span className={`font-mono text-4xl font-bold ${accent ? 'text-carbon-brand' : 'text-carbon-text-primary'}`}>
        {animated}
      </span>
      <span className="text-sm text-carbon-text-secondary">{label}</span>
    </div>
  )
}

function NextAction({ module, certifications, navigate }) {
  if (!module) {
    return (
      <div className="bg-carbon-layer-01 border border-carbon-border border-l-4 border-l-carbon-success rounded-lg p-4">
        <p className="text-xs text-carbon-text-placeholder uppercase tracking-wider mb-1">Status</p>
        <p className="text-base font-semibold text-carbon-success">✓ All modules certified — you're ready to contribute!</p>
      </div>
    )
  }
  return (
    <div className="bg-carbon-layer-01 border border-carbon-border border-l-4 border-l-carbon-quest rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-carbon-text-placeholder uppercase tracking-wider mb-1">Next Recommended Action</p>
        <p className="text-base font-semibold text-carbon-text-primary truncate">
          {certifications.includes(module.id) ? 'Explore Quests' : `Start Quiz — ${module.name}`}
        </p>
        <p className="text-sm text-carbon-text-secondary mt-0.5 line-clamp-1">{module.summary?.slice(0, 90)}…</p>
      </div>
      <PrimaryButton
        onClick={() => navigate(certifications.includes(module.id) ? '/quests' : `/modules/${module.id}`)}
        className="flex-shrink-0"
      >
        Begin →
      </PrimaryButton>
    </div>
  )
}

function BadgeItem({ badge, earned }) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 w-16 cursor-default"
      title={earned ? badge.criteria : 'Not yet earned'}
    >
      <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-xl transition-all duration-300 ${
        earned
          ? 'border-carbon-xp-gold bg-carbon-warning-bg animate-badge-pop shadow-[0_0_12px_rgba(241,194,27,0.25)]'
          : 'border-carbon-border bg-carbon-layer-02 opacity-35 grayscale'
      }`}>
        {earned ? '★' : '○'}
      </div>
      <span className="text-xs text-center leading-tight text-carbon-text-secondary">{badge.name}</span>
    </div>
  )
}

export default function Dashboard({ addToast }) {
  const { manifest, loading, error, reload }  = useManifest()
  const { certifications, completedQuests, docFixesShipped, earnedBadges, awardBadge } = useProgress()
  const navigate = useNavigate()

  useEffect(() => {
    if (!earnedBadges.includes('first-light')) {
      awardBadge('first-light')
      addToast?.({ message: '🏅 Badge earned: First Light', type: 'badge' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-3 gap-4">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
        <SkeletonCard lines={2} />
      </div>
    )
  }

  if (error || !manifest) {
    return (
      <EmptyState
        icon="⚠️"
        heading="Couldn't load the curriculum"
        body={error || 'No manifest was returned by the server.'}
        action={
          <PrimaryButton onClick={reload}>Retry</PrimaryButton>
        }
      />
    )
  }

  const modules    = manifest?.modules ?? []
  const totalMods  = modules.length
  const certCount  = certifications.length
  const overallPct = totalMods > 0 ? Math.round((certCount / totalMods) * 100) : 0
  const nextModule = modules.find(m => !certifications.includes(m.id))

  return (
    <div className="space-y-5 max-w-4xl animate-fade-up">
      {/* Hero progress card */}
      <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-carbon-text-primary tracking-tight">
              {manifest.repo.name}
            </h2>
            <p className="text-sm text-carbon-text-secondary mt-0.5 leading-relaxed">
              {manifest.overview.purpose}
            </p>
          </div>
          <span className="font-mono text-xs text-carbon-text-placeholder flex-shrink-0 mt-1">
            #{manifest.repo.commit}
          </span>
        </div>
        <ProgressBar pct={overallPct} label="Overall Ramp-up Progress" />
        <div className="flex flex-wrap gap-2 pt-1">
          {manifest.overview.techStack.map(t => (
            <span key={t} className="font-mono text-xs px-2 py-1 bg-carbon-layer-02 border border-carbon-border rounded text-carbon-text-secondary">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard value={certCount}       label="Modules Certified" accent={certCount > 0} />
        <StatCard value={completedQuests} label="Quests Completed" />
        <StatCard value={docFixesShipped} label="Doc Fixes Shipped" />
      </div>

      {/* Next action */}
      <NextAction module={nextModule} certifications={certifications} navigate={navigate} />

      {/* Badges */}
      {manifest.badges?.length > 0 && (
        <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-carbon-text-primary">Achievements</h3>
            <span className="font-mono text-xs text-carbon-text-placeholder">
              {earnedBadges.length}/{manifest.badges.length} earned
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            {manifest.badges.map(b => (
              <BadgeItem key={b.id} badge={b} earned={earnedBadges.includes(b.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
