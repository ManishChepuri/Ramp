import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useManifest }  from '../context/ManifestContext'
import { useProgress }  from '../context/ProgressContext'
import { useQuiz }      from '../hooks/useQuiz'
import { useRepoMeta }  from '../hooks/useRepoMeta'
import KeyFilesBox      from '../components/KeyFilesBox'
import IdePanel         from '../components/ide/IdePanel'
import SplitPane        from '../components/SplitPane'
import { RiskBadge, ComplexityBadge, CertificationChip } from '../components/ui/index'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false, theme: 'dark', darkMode: true, background: 'transparent' })

// ── Mermaid diagram ──────────────────────────────────────────────────────────
function MermaidDiagram({ diagram }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const id = `mermaid-${Math.random().toString(36).slice(2)}`
    mermaid.render(id, diagram.mermaid).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg
    }).catch(() => {
      if (ref.current) ref.current.innerHTML = '<p class="text-carbon-text-placeholder text-xs">Diagram unavailable</p>'
    })
  }, [diagram.mermaid])

  return (
    <div className="bg-carbon-layer-02 border border-carbon-border rounded-lg p-4">
      <p className="text-xs text-carbon-text-placeholder mb-2 font-mono">{diagram.type} · {diagram.title}</p>
      <div ref={ref} className="overflow-x-auto" />
    </div>
  )
}

// ── Quiz card ────────────────────────────────────────────────────────────────
function QuizSection({ module, addToast }) {
  const { certifyModule, recordQuizResult, awardXp, awardBadge, earnedBadges } = useProgress()
  const quiz = useQuiz(module.quiz ?? [])

  useEffect(() => {
    if (quiz.phase !== 'result') return
    recordQuizResult(module.id, quiz.score, quiz.total)
    if (quiz.passed) {
      certifyModule(module.id)
      awardXp(50)
      addToast?.({ message: `✓ Certified on ${module.name} (+50 XP)`, type: 'xp' })
      if (!earnedBadges.includes('certified')) {
        awardBadge('certified')
        addToast?.({ message: '🏅 Badge: Certified', type: 'badge', duration: 4000 })
      }
    } else {
      addToast?.({ message: `Score: ${quiz.pct}% — 80% needed to certify`, type: 'info' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.phase])

  if (quiz.phase === 'result') {
    return (
      <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-5 space-y-4">
        <h3 className="text-base font-semibold text-carbon-text-primary">Quiz Complete</h3>
        <div className="flex items-center gap-4">
          <span className="font-mono text-4xl font-bold text-carbon-text-primary">{quiz.pct}<span className="text-xl text-carbon-text-secondary">%</span></span>
          <div>
            <p className="text-sm text-carbon-text-primary font-medium">{quiz.score}/{quiz.total} correct</p>
            <p className={`text-sm font-semibold mt-0.5 ${quiz.passed ? 'text-carbon-success' : 'text-carbon-error'}`}>
              {quiz.passed ? '✓ Module Certified' : '✗ 80% required — try again'}
            </p>
          </div>
        </div>
        {!quiz.passed && (
          <button onClick={() => quiz.reset()}
            className="px-4 py-2 bg-carbon-brand text-white text-sm rounded hover:bg-carbon-interactive-hover transition-colors">
            Retry Quiz
          </button>
        )}
        {quiz.passed && <span className="text-carbon-success text-sm font-medium">✓ Certification awarded!</span>}
      </div>
    )
  }

  if (!quiz.current) return <p className="text-carbon-text-placeholder text-sm">No quiz questions available.</p>

  const q = quiz.current

  return (
    <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: quiz.total }).map((_, i) => (
          <span key={i} className={`w-2 h-2 rounded-full transition-colors ${
            i < quiz.index ? 'bg-carbon-success' : i === quiz.index ? 'bg-carbon-brand' : 'bg-carbon-layer-02 border border-carbon-border'
          }`} />
        ))}
        <span className="text-xs text-carbon-text-placeholder ml-2">Q{quiz.index + 1} of {quiz.total}</span>
      </div>

      <p className="text-base font-medium text-carbon-text-primary leading-snug">{q.question}</p>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          let cls = 'w-full text-left px-4 py-3 rounded border text-sm transition-colors '
          if (!quiz.revealed) {
            cls += quiz.selected === i
              ? 'border-carbon-brand bg-carbon-brand/10 text-carbon-text-primary'
              : 'border-carbon-border bg-carbon-layer-02 text-carbon-text-secondary hover:border-carbon-interactive hover:text-carbon-text-primary'
          } else {
            if (i === q.correctIndex)       cls += 'border-carbon-success bg-carbon-success-bg text-carbon-success'
            else if (i === quiz.selected)   cls += 'border-carbon-error   bg-carbon-error-bg   text-carbon-error'
            else                            cls += 'border-carbon-border bg-carbon-layer-02 text-carbon-text-placeholder'
          }
          return (
            <button key={i} className={cls} onClick={() => quiz.select(i)}>
              {opt}
            </button>
          )
        })}
      </div>

      {quiz.revealed && (
        <div className="bg-carbon-layer-02 border border-carbon-border rounded p-3 text-sm text-carbon-text-secondary">
          <span className="text-carbon-text-placeholder font-medium">Explanation: </span>
          {q.explanation}
        </div>
      )}

      {!quiz.revealed ? (
        <button
          disabled={quiz.selected === null}
          onClick={quiz.check}
          className="px-4 py-2 bg-carbon-brand text-white text-sm rounded disabled:opacity-40 hover:bg-carbon-interactive-hover transition-colors"
        >
          Check Answer
        </button>
      ) : (
        <button
          onClick={quiz.next}
          className="px-4 py-2 bg-carbon-brand text-white text-sm rounded hover:bg-carbon-interactive-hover transition-colors"
        >
          {quiz.index < quiz.total - 1 ? 'Next Question →' : 'See Results'}
        </button>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ModuleDetail({ addToast }) {
  const { id }       = useParams()
  const { manifest } = useManifest()
  const { isCertified, earnedBadges, awardBadge } = useProgress()
  const navigate     = useNavigate()
  const repoMeta     = useRepoMeta()

  const module   = manifest?.modules?.find(m => m.id === id)
  const diagrams = manifest?.diagrams ?? []
  const keyFiles = module?.keyFiles ?? []

  const [openTabs, setOpenTabs]   = useState([])
  const [activePath, setActivePath] = useState(null)

  // Open the first key file once, when the repo checkout is available.
  useEffect(() => {
    if (repoMeta.available && keyFiles.length && openTabs.length === 0) {
      setOpenTabs([keyFiles[0]])
      setActivePath(keyFiles[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoMeta.available, module?.id])

  useEffect(() => {
    if (!earnedBadges.includes('cartographer') && diagrams.length > 0) {
      awardBadge('cartographer')
      addToast?.({ message: '🏅 Badge: Cartographer', type: 'badge' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!module) return <p className="text-carbon-text-placeholder">Module not found.</p>

  function openFile(path) {
    setOpenTabs(tabs => (tabs.includes(path) ? tabs : [...tabs, path]))
    setActivePath(path)
  }

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-carbon-text-primary">{module.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <RiskBadge level={module.riskLevel} />
            <ComplexityBadge level={module.complexity} />
            <CertificationChip status={isCertified(module.id) ? 'certified' : 'in-progress'} />
          </div>
        </div>
        <div className="flex flex-row items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate(`/modules/${id}/explain`)}
            className="px-4 py-2 text-sm font-semibold border border-carbon-interactive text-carbon-interactive rounded hover:bg-carbon-interactive/10 transition-colors"
          >
            Explain Back →
          </button>
          {module.sabotage?.length > 0 && isCertified(module.id) && (
            <button
              onClick={() => navigate(`/modules/${id}/sabotage`)}
              className="px-4 py-2 text-sm font-semibold border border-carbon-sabotage/50 text-carbon-sabotage bg-carbon-sabotage-bg rounded hover:opacity-90 transition-colors"
            >
              Sabotage Mode
            </button>
          )}
        </div>
      </div>

      {/* Two-pane workspace: docs + quiz on the left, integrated IDE on the right.
          Drag the divider to resize; double-click it to reset. */}
      <SplitPane
        storageKey="ramp.split.module"
        left={
          <div className="space-y-5 stagger-in">
            <p className="text-sm text-carbon-text-secondary leading-relaxed">{module.summary}</p>

            <KeyFilesBox
              files={keyFiles}
              activePath={activePath}
              onOpen={openFile}
              disabled={repoMeta.available === false}
            />

            {diagrams.map(d => <MermaidDiagram key={d.title} diagram={d} />)}

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-carbon-text-primary">Module Quiz</h3>
              <QuizSection module={module} addToast={addToast} />
            </div>
          </div>
        }
        right={
          <IdePanel
            tabs={openTabs.map(p => ({ path: p, editable: false }))}
            activePath={activePath}
            onActivePathChange={setActivePath}
            repoAvailable={repoMeta.available}
            statusBar={
              <p className="text-[11px] text-carbon-text-placeholder">
                Read-only · click a key file on the left to open it here
              </p>
            }
          />
        }
      />
    </div>
  )
}
