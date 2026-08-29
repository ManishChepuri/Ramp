import { useManifest }  from '../context/ManifestContext'
import { useProgress }  from '../context/ProgressContext'
import { XpChip, DifficultyBadge, EmptyState } from '../components/ui/index'

function QuestCard({ quest, status, locked, onStart, onComplete, lockedReason }) {
  const borderColor = quest.type === 'doc-fix' ? 'border-l-carbon-quest' : 'border-l-carbon-interactive'

  return (
    <div className={`bg-carbon-layer-01 border border-carbon-border border-l-4 ${borderColor} rounded-lg p-4 relative transition-colors hover:border-carbon-border-strong ${locked ? 'opacity-50' : ''}`}>
      {locked && (
        <p className="text-xs text-carbon-text-placeholder mb-2 flex items-center gap-1">
          <span>🔒</span> {lockedReason}
        </p>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-carbon-text-primary leading-snug">{quest.title}</h4>
        <XpChip xp={quest.xp} />
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <DifficultyBadge level={quest.difficulty} />
        <span className={`text-xs px-2 py-0.5 rounded-sm border font-semibold ${
          quest.type === 'doc-fix'
            ? 'text-carbon-quest bg-carbon-quest-bg border-carbon-quest/20'
            : 'text-carbon-interactive bg-carbon-brand/10 border-carbon-interactive/20'
        }`}>
          {quest.type === 'doc-fix' ? 'Doc Fix' : 'Starter'}
        </span>
      </div>
      {quest.files?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {quest.files.map(f => (
            <span key={f} className="font-mono text-xs text-carbon-text-placeholder bg-carbon-layer-02 px-1.5 py-0.5 rounded border border-carbon-border truncate max-w-[200px]">
              {f}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-carbon-text-secondary leading-snug mb-3">{quest.rationale}</p>
      {!locked && (
        <div className="flex gap-2">
          {status === 'available' && (
            <button
              onClick={onStart}
              className="px-3 py-1.5 text-xs font-medium bg-carbon-brand text-white rounded hover:bg-carbon-interactive-hover transition-colors"
            >
              Start Quest
            </button>
          )}
          {status === 'in-progress' && (
            <button
              onClick={onComplete}
              className="px-3 py-1.5 text-xs font-medium bg-carbon-success text-white rounded hover:opacity-90 transition-colors"
            >
              ✓ Mark Complete
            </button>
          )}
          {status === 'complete' && (
            <span className="text-xs text-carbon-success font-semibold flex items-center gap-1">✓ Completed</span>
          )}
        </div>
      )}
    </div>
  )
}

function Column({ title, accentClass, count, children, emptyMessage }) {
  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className={`flex items-center gap-2 pb-2.5 border-b ${accentClass}`}>
        <h3 className="text-sm font-semibold text-carbon-text-primary">{title}</h3>
        <span className="font-mono text-xs text-carbon-text-placeholder bg-carbon-layer-02 border border-carbon-border px-1.5 py-0.5 rounded-sm">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 border border-dashed border-carbon-border rounded-lg">
          <p className="text-xs text-carbon-text-placeholder">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export default function QuestBoard({ addToast }) {
  const { manifest }    = useManifest()
  const {
    isCertified, questStates, setQuestStatus,
    awardXp, awardBadge, addContribution, earnedBadges
  } = useProgress()

  const allQuests = (manifest?.modules ?? []).flatMap(m =>
    (m.quests ?? []).map(q => ({
      ...q,
      moduleId:   m.id,
      moduleName: m.name,
    }))
  )

  const isLocked    = q => !isCertified(q.moduleId)
  const lockedReason = q => `Certify "${q.moduleName}" first`
  const getStatus   = q => questStates[q.id] ?? 'available'

  function handleStart(q) {
    setQuestStatus(q.id, 'in-progress')
    addToast?.({ message: `Started: ${q.title}`, type: 'info' })
  }

  function handleComplete(q) {
    setQuestStatus(q.id, 'complete')
    awardXp(q.xp)
    addToast?.({ message: `Quest complete! +${q.xp} XP`, type: 'xp' })
    addContribution({ id: q.id, title: q.title, type: q.type, xp: q.xp })
    if (!earnedBadges.includes('first-blood')) {
      awardBadge('first-blood')
      addToast?.({ message: '🏅 Badge: First Blood', type: 'badge' })
    }
    if (q.type === 'doc-fix' && !earnedBadges.includes('rent-paid')) {
      awardBadge('rent-paid')
      addToast?.({ message: '🏅 Badge: Rent Paid', type: 'badge' })
    }
  }

  if (!manifest) return null

  if (allQuests.length === 0) {
    return (
      <EmptyState
        icon="◎"
        heading="No quests yet"
        body="Complete module quizzes to unlock starter tasks and doc-fix quests."
      />
    )
  }

  const available  = allQuests.filter(q => !isLocked(q) && getStatus(q) === 'available')
  const inProgress = allQuests.filter(q => !isLocked(q) && getStatus(q) === 'in-progress')
  const completed  = allQuests.filter(q => getStatus(q) === 'complete')
  const locked     = allQuests.filter(q => isLocked(q))

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="flex items-center gap-4">
        <p className="text-sm text-carbon-text-secondary flex-1">
          Teal border = doc-fix quest (improves the codebase). Blue border = starter task. Complete module quizzes to unlock.
        </p>
        <span className="font-mono text-xs text-carbon-text-placeholder">
          {completed.length}/{allQuests.length} complete
        </span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Column
          title="Available"
          accentClass="border-carbon-border"
          count={available.length + locked.length}
          emptyMessage="No quests available yet"
        >
          {[...available, ...locked].map(q => (
            <QuestCard key={q.id} quest={q} status={getStatus(q)} locked={isLocked(q)}
              lockedReason={lockedReason(q)}
              onStart={() => handleStart(q)}
              onComplete={() => handleComplete(q)}
            />
          ))}
        </Column>

        <Column
          title="In Progress"
          accentClass="border-carbon-interactive"
          count={inProgress.length}
          emptyMessage="Start a quest to see it here"
        >
          {inProgress.map(q => (
            <QuestCard key={q.id} quest={q} status="in-progress" locked={false}
              onComplete={() => handleComplete(q)}
            />
          ))}
        </Column>

        <Column
          title="Completed"
          accentClass="border-carbon-success"
          count={completed.length}
          emptyMessage="No completed quests yet"
        >
          {completed.map(q => (
            <QuestCard key={q.id} quest={q} status="complete" locked={false} />
          ))}
        </Column>
      </div>
    </div>
  )
}
