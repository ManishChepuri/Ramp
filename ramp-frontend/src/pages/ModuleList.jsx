import { useNavigate } from 'react-router-dom'
import { useManifest }  from '../context/ManifestContext'
import { useProgress }  from '../context/ProgressContext'
import {
  RiskBadge, ComplexityBadge, CertificationChip,
  SkeletonCard, EmptyState, PrimaryButton, GhostButton, SubtleButton
} from '../components/ui/index'

function ModuleCard({ module, certStatus, locked, onQuiz, onExplain, onView }) {
  return (
    <div className={`bg-carbon-layer-01 border border-carbon-border rounded-lg p-5 relative transition-opacity duration-200 group ${locked ? 'opacity-50' : 'hover:border-carbon-border-strong'}`}>
      {locked && (
        <div className="absolute inset-0 rounded-lg flex items-center justify-center z-10 backdrop-blur-[1px]">
          <div className="bg-carbon-layer-01/90 border border-carbon-border rounded px-3 py-1.5 flex items-center gap-2">
            <span className="text-carbon-text-placeholder text-xs font-medium">
              🔒 Complete prerequisites first
            </span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-carbon-text-primary mb-1">{module.name}</h3>
          <p className="text-sm text-carbon-text-secondary leading-snug line-clamp-2">{module.summary}</p>
        </div>
        <CertificationChip status={certStatus} />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <RiskBadge level={module.riskLevel} />
        <ComplexityBadge level={module.complexity} />
        {module.prerequisites?.length > 0 && (
          <span className="text-xs text-carbon-text-placeholder">
            Requires: {module.prerequisites.join(', ')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <PrimaryButton onClick={onQuiz} disabled={locked} className="text-xs px-3 py-1.5">
          Take Quiz
        </PrimaryButton>
        <GhostButton onClick={onExplain} disabled={locked} className="text-xs px-3 py-1.5">
          Explain Back
        </GhostButton>
        <SubtleButton onClick={onView}>
          Details →
        </SubtleButton>
      </div>
    </div>
  )
}

export default function ModuleList() {
  const { manifest, loading } = useManifest()
  const { isCertified, isModuleLocked, quizHistory } = useProgress()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[1, 2, 3].map(i => <SkeletonCard key={i} lines={4} />)}
      </div>
    )
  }

  const modules = manifest?.modules ?? []

  if (modules.length === 0) {
    return (
      <EmptyState
        icon="◈"
        heading="No modules generated yet"
        body="Run ramp generate to analyze the repository and produce the module curriculum."
      />
    )
  }

  function certStatus(module) {
    if (isCertified(module.id)) return 'certified'
    if (quizHistory[module.id]) return 'in-progress'
    return 'locked'
  }

  const certifiedCount = modules.filter(m => isCertified(m.id)).length

  return (
    <div className="space-y-4 max-w-3xl animate-fade-up">
      <div className="flex items-center justify-between">
        <p className="text-sm text-carbon-text-secondary">
          {modules.length} modules — complete them in order to unlock quests and earn certification.
        </p>
        <span className="font-mono text-xs text-carbon-text-placeholder">
          {certifiedCount}/{modules.length} certified
        </span>
      </div>

      {modules.map(m => (
        <ModuleCard
          key={m.id}
          module={m}
          certStatus={certStatus(m)}
          locked={isModuleLocked(m)}
          onQuiz={() => navigate(`/modules/${m.id}`)}
          onExplain={() => navigate(`/modules/${m.id}/explain`)}
          onView={() => navigate(`/modules/${m.id}`)}
        />
      ))}
    </div>
  )
}
