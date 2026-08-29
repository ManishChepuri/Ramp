import { useParams, useNavigate }  from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useManifest }   from '../context/ManifestContext'
import { useProgress }   from '../context/ProgressContext'
import { useSabotage }   from '../hooks/useSabotage'

// ── Stopwatch ─────────────────────────────────────────────────────────────────
function Stopwatch() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  return (
    <span className="font-mono text-2xl font-bold text-carbon-text-primary tabular-nums">
      {mm}:{ss}
    </span>
  )
}

// ── Hint panel ────────────────────────────────────────────────────────────────
function HintPanel({ hints, revealed, xpCosts, onReveal, xp }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-carbon-text-secondary uppercase tracking-wider">
        Progressive Hints
      </h4>
      {hints.map((hint, i) => {
        const isRevealed = i < revealed
        const isNext     = i === revealed
        const cost       = xpCosts[i] ?? 20

        return (
          <div
            key={i}
            className={`rounded-lg border p-3 transition-all duration-300 ${
              isRevealed
                ? 'bg-carbon-layer-02 border-carbon-border'
                : 'bg-carbon-layer-01 border-carbon-border opacity-70'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs text-carbon-text-placeholder mb-1 font-medium">
                  Hint {i + 1}
                </p>
                {isRevealed ? (
                  <p className="text-sm text-carbon-text-primary leading-snug">{hint}</p>
                ) : (
                  <p className="text-sm text-carbon-text-placeholder italic">Locked</p>
                )}
              </div>
              {isNext && (
                <button
                  onClick={onReveal}
                  disabled={xp < cost}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium border border-carbon-warning/40 text-carbon-warning bg-carbon-warning-bg rounded hover:opacity-90 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  Reveal (−{cost} XP)
                </button>
              )}
            </div>
          </div>
        )
      })}
      {revealed >= hints.length && hints.length > 0 && (
        <p className="text-xs text-carbon-text-placeholder text-center py-1">All hints revealed</p>
      )}
    </div>
  )
}

// ── Fix submission ────────────────────────────────────────────────────────────
function FixSubmission({ fix, setFix, onSubmit, phase, attempts }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-carbon-text-secondary uppercase tracking-wider mb-1.5 block">
          Your Fix
        </label>
        <textarea
          value={fix}
          onChange={e => setFix(e.target.value)}
          rows={4}
          placeholder="Paste or type the corrected line(s) here…"
          className="w-full bg-carbon-layer-02 border border-carbon-border rounded-lg p-3 text-sm font-mono text-carbon-text-primary placeholder-carbon-text-placeholder focus:border-carbon-interactive focus:outline-none resize-none leading-relaxed"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={!fix.trim()}
          onClick={() => onSubmit(fix)}
          className="px-4 py-2 text-sm font-medium bg-carbon-brand text-white rounded disabled:opacity-40 hover:bg-carbon-interactive-hover transition-colors"
        >
          Submit Fix
        </button>
        {attempts > 0 && (
          <span className="text-xs text-carbon-text-placeholder">
            {attempts} attempt{attempts !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Feedback flash */}
      {phase === 'wrong' && (
        <div className="bg-carbon-error-bg border border-carbon-error/30 rounded-lg px-4 py-2 text-sm text-carbon-error font-medium animate-fade-up">
          ✗ Not quite — keep looking
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Sabotage({ addToast }) {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { manifest } = useManifest()
  const { xp, awardXp, awardBadge, earnedBadges, isCertified } = useProgress()

  const module = manifest?.modules?.find(m => m.id === id)
  // Pick first available sabotage case that matches dev's level (simplified: just first)
  const sabCase = module?.sabotage?.[0] ?? null

  const sab = useSabotage(sabCase)

  function handleRevealHint() {
    const cost = sab.XP_COSTS[sab.hintsRevealed] ?? 20
    if (xp >= cost) {
      awardXp(-cost)
      sab.revealHint()
    }
  }

  function handleSubmit(fix) {
    const correct = sab.submitFix(fix)
    if (correct) {
      awardXp(75)
      addToast?.({ message: '🐛 Bug found! +75 XP', type: 'xp' })
      if (!earnedBadges.includes('bug-hunter')) {
        awardBadge('bug-hunter')
        addToast?.({ message: '🏅 Badge: Bug Hunter', type: 'badge' })
      }
    }
  }

  if (!module) {
    return <p className="text-carbon-text-placeholder">Module not found.</p>
  }

  if (!isCertified(module.id)) {
    return (
      <div className="max-w-2xl space-y-4 animate-fade-up">
        <button
          onClick={() => navigate(`/modules/${id}`)}
          className="text-xs text-carbon-text-placeholder hover:text-carbon-interactive flex items-center gap-1 transition-colors"
        >
          ← Back to {module.name}
        </button>
        <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-8 text-center space-y-3">
          <p className="text-3xl">🔒</p>
          <p className="text-base font-semibold text-carbon-text-primary">Certification required</p>
          <p className="text-sm text-carbon-text-secondary">
            Complete the {module.name} quiz before attempting sabotage mode.
          </p>
          <button
            onClick={() => navigate(`/modules/${id}`)}
            className="mt-2 px-4 py-2 bg-carbon-brand text-white text-sm rounded hover:bg-carbon-interactive-hover transition-colors"
          >
            Go to Quiz
          </button>
        </div>
      </div>
    )
  }

  if (!sabCase) {
    return (
      <div className="max-w-2xl space-y-4">
        <button
          onClick={() => navigate(`/modules/${id}`)}
          className="text-xs text-carbon-text-placeholder hover:text-carbon-interactive flex items-center gap-1 transition-colors"
        >
          ← Back to {module.name}
        </button>
        <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-8 text-center">
          <p className="text-sm text-carbon-text-placeholder">No sabotage cases available for this module.</p>
        </div>
      </div>
    )
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (sab.phase === 'correct') {
    return (
      <div className="max-w-2xl space-y-4 animate-fade-up">
        <div className="bg-carbon-success-bg border border-carbon-success/30 rounded-lg p-8 text-center space-y-3">
          <p className="text-4xl">🐛</p>
          <p className="text-xl font-bold text-carbon-success">Bug Found!</p>
          <p className="text-sm text-carbon-text-secondary">
            You located and fixed the injected defect in {sab.attempts} attempt{sab.attempts !== 1 ? 's' : ''}.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => { sab.reset(); navigate(`/modules/${id}`) }}
              className="px-4 py-2 bg-carbon-brand text-white text-sm rounded hover:bg-carbon-interactive-hover transition-colors"
            >
              Back to Module
            </button>
            <button
              onClick={sab.reset}
              className="px-4 py-2 border border-carbon-border text-carbon-text-secondary text-sm rounded hover:bg-carbon-layer-02 transition-colors"
            >
              Try Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Hunting state ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-5 animate-fade-up">
      {/* Back */}
      <button
        onClick={() => navigate(`/modules/${id}`)}
        className="text-xs text-carbon-text-placeholder hover:text-carbon-interactive flex items-center gap-1 transition-colors"
      >
        ← Back to {module.name}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-carbon-sabotage uppercase tracking-wider">
              Sabotage Mode
            </span>
            <span className="text-xs px-2 py-0.5 rounded-sm border border-carbon-sabotage/30 text-carbon-sabotage bg-carbon-sabotage-bg font-semibold">
              {sabCase.difficulty}
            </span>
          </div>
          <h2 className="text-xl font-bold text-carbon-text-primary">{module.name} — Bug Hunt</h2>
        </div>
        <Stopwatch />
      </div>

      {/* Isolation notice — mandatory per FR-2.16 */}
      <div className="flex items-start gap-3 bg-carbon-layer-02 border border-carbon-border rounded-lg px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5 text-carbon-interactive">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
        </svg>
        <p className="text-xs text-carbon-text-secondary leading-relaxed">
          <strong className="text-carbon-text-primary">Isolation notice:</strong> This challenge operates on an isolated copy of the module. Your real repository is never modified.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left — symptom + fix */}
        <div className="col-span-3 space-y-4">
          {/* Symptom */}
          <div className="bg-carbon-layer-01 border border-carbon-sabotage/30 border-l-4 border-l-carbon-sabotage rounded-lg p-4">
            <p className="text-xs font-semibold text-carbon-sabotage uppercase tracking-wider mb-2">
              Observable Symptom
            </p>
            <p className="text-sm text-carbon-text-primary leading-relaxed font-medium">
              {sabCase.symptom}
            </p>
          </div>

          {/* Affected file — revealed after hint 1 */}
          <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-3">
            <p className="text-xs text-carbon-text-placeholder mb-1 font-medium">Affected File</p>
            {sab.hintsRevealed >= 1 ? (
              <p className="font-mono text-sm text-carbon-interactive">{sabCase.file}</p>
            ) : (
              <p className="text-sm text-carbon-text-placeholder italic">Reveal hint 1 to see the file</p>
            )}
          </div>

          {/* Fix submission */}
          <FixSubmission
            fix={sab.fix}
            setFix={sab.setFix}
            onSubmit={handleSubmit}
            phase={sab.phase}
            attempts={sab.attempts}
          />
        </div>

        {/* Right — hints */}
        <div className="col-span-2">
          <HintPanel
            hints={sab.hints}
            revealed={sab.hintsRevealed}
            xpCosts={sab.XP_COSTS}
            onReveal={handleRevealHint}
            xp={xp}
          />
        </div>
      </div>
    </div>
  )
}
