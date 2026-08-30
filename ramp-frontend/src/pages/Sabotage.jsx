import { useParams, useNavigate }  from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useManifest }   from '../context/ManifestContext'
import { useProgress }   from '../context/ProgressContext'
import { useRepoMeta }   from '../hooks/useRepoMeta'
import { useSabotage }   from '../hooks/useSabotage'
import KeyFilesBox       from '../components/KeyFilesBox'
import IdePanel          from '../components/ide/IdePanel'
import SplitPane         from '../components/SplitPane'

// ── Stopwatch ─────────────────────────────────────────────────────────────────
function Stopwatch() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  return <span className="font-mono text-2xl font-bold text-carbon-text-primary tabular-nums">{mm}:{ss}</span>
}

// ── Progressive (canned) hints ───────────────────────────────────────────────
function HintPanel({ hints, revealed, xpCosts, onReveal, xp }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-carbon-text-secondary uppercase tracking-wider">Progressive Hints</h4>
      {hints.map((hint, i) => {
        const isRevealed = i < revealed
        const isNext     = i === revealed
        const cost       = xpCosts[i] ?? 20
        return (
          <div key={i} className={`rounded-lg border p-3 transition-all duration-300 ${
            isRevealed ? 'bg-carbon-layer-02 border-carbon-border' : 'bg-carbon-layer-01 border-carbon-border opacity-70'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs text-carbon-text-placeholder mb-1 font-medium">Hint {i + 1}</p>
                {isRevealed
                  ? <p className="text-sm text-carbon-text-primary leading-snug">{hint}</p>
                  : <p className="text-sm text-carbon-text-placeholder italic">Locked</p>}
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

// ── Auto hint unlocked after 3 failed attempts ───────────────────────────────
function AutoHintCard({ text }) {
  if (!text) return null
  return (
    <div className="rounded-lg border border-carbon-interactive/40 bg-carbon-brand/10 p-3 space-y-1 animate-fade-up">
      <p className="text-xs font-semibold text-carbon-interactive uppercase tracking-wider">
        Extra hint · unlocked after 3 attempts
      </p>
      <p className="text-sm text-carbon-text-primary leading-snug">{text}</p>
    </div>
  )
}

// ── Full reveal after the 5th failed attempt ─────────────────────────────────
function SolutionReveal({ solution }) {
  if (!solution) return null
  return (
    <div className="rounded-lg border border-carbon-sabotage/40 bg-carbon-sabotage-bg p-4 space-y-3 animate-fade-up">
      <p className="text-xs font-semibold text-carbon-sabotage uppercase tracking-wider">
        Attempt limit reached · here is the bug
      </p>
      <div className="text-sm text-carbon-text-primary space-y-1.5">
        <p>
          <span className="text-carbon-text-placeholder">Location: </span>
          <span className="font-mono text-carbon-interactive">{solution.file}</span>
          {solution.line != null && <span className="font-mono text-carbon-text-secondary"> : line {solution.line}</span>}
        </p>
        {solution.injectedLine && (
          <p><span className="text-carbon-text-placeholder">Currently: </span>
            <code className="font-mono text-carbon-error">{solution.injectedLine}</code></p>
        )}
        {solution.correctLine && (
          <p><span className="text-carbon-text-placeholder">Should be: </span>
            <code className="font-mono text-carbon-success">{solution.correctLine}</code></p>
        )}
      </div>
      <p className="text-xs text-carbon-text-secondary leading-relaxed">
        Apply that change in the editor and submit to close out the challenge. No XP is awarded once the
        solution has been shown.
      </p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Sabotage({ addToast }) {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { manifest } = useManifest()
  const repoMeta     = useRepoMeta()
  const { xp, awardXp, awardBadge, earnedBadges, isCertified, sabotageHistory, recordSabotage } = useProgress()

  const module  = manifest?.modules?.find(m => m.id === id)
  const sabCase = module?.sabotage?.[0] ?? null

  const persisted = sabCase ? sabotageHistory?.[sabCase.id] : null

  const onSolved = useCallback((info) => {
    recordSabotage(sabCase.id, { solved: true, attempts: info.attempts, revealed: info.revealed })
    if (!info.revealed) {
      awardXp(75)
      addToast?.({ message: '🐛 Bug fixed! +75 XP', type: 'xp' })
      if (!earnedBadges.includes('bug-hunter')) {
        awardBadge('bug-hunter')
        addToast?.({ message: '🏅 Badge: Bug Hunter', type: 'badge' })
      }
    } else {
      addToast?.({ message: 'Challenge closed out with the solution shown', type: 'info' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sabCase?.id, earnedBadges])

  const sab = useSabotage(sabCase, { moduleId: id, initial: persisted, onSolved })

  // Editor state: seeded with the file as the developer sees it (buggy version).
  const [editorValue, setEditorValue] = useState('')
  const [seed, setSeed]               = useState('')
  const [seedError, setSeedError]     = useState(null)
  const [activePath, setActivePath]   = useState(sabCase?.file ?? null)
  const [openExtra, setOpenExtra]     = useState([])   // read-only key files opened alongside
  const editorRef = useRef(null)

  // Always submit the editor's live text, not a possibly-stale React snapshot.
  const currentCode = () => editorRef.current?.getValue?.() ?? editorValue

  useEffect(() => {
    if (!sabCase || repoMeta.available === false) return
    let alive = true
    setSeedError(null)
    fetch(`/api/sabotage/${id}/${encodeURIComponent(sabCase.id)}/file`)
      .then(async r => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error || `Could not load the file (${r.status})`)
        return body
      })
      .then(({ content }) => { if (alive) { setSeed(content); setEditorValue(content); setActivePath(sabCase.file) } })
      .catch(err => { if (alive) setSeedError(err.message) })
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sabCase?.id, repoMeta.available])

  // Persist attempt count as it climbs.
  useEffect(() => {
    if (sabCase && sab.attempts > 0) recordSabotage(sabCase.id, { attempts: sab.attempts })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sab.attempts])

  // Toast when the extra hint unlocks.
  const prevAutoHint = useRef(sab.autoHint)
  useEffect(() => {
    if (!prevAutoHint.current && sab.autoHint) {
      addToast?.({ message: '💡 Extra hint unlocked (3 attempts)', type: 'info' })
    }
    prevAutoHint.current = sab.autoHint
  }, [sab.autoHint, addToast])

  function handleRevealHint() {
    const cost = sab.XP_COSTS[sab.hintsRevealed] ?? 20
    if (xp >= cost) { awardXp(-cost); sab.revealHint() }
  }

  function openReadOnly(path) {
    if (path === sabCase.file) { setActivePath(path); return }
    setOpenExtra(list => (list.includes(path) ? list : [...list, path]))
    setActivePath(path)
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!module) return <p className="text-carbon-text-placeholder">Module not found.</p>

  if (!isCertified(module.id)) {
    return (
      <div className="max-w-2xl space-y-4 animate-fade-up">
        <BackLink onClick={() => navigate(`/modules/${id}`)} name={module.name} />
        <div className="card-hover bg-carbon-layer-01 border border-carbon-border rounded-lg p-8 text-center space-y-3">
          <p className="text-3xl">🔒</p>
          <p className="text-base font-semibold text-carbon-text-primary">Certification required</p>
          <p className="text-sm text-carbon-text-secondary">Complete the {module.name} quiz before attempting sabotage mode.</p>
          <button onClick={() => navigate(`/modules/${id}`)}
            className="mt-2 px-4 py-2 bg-carbon-brand text-white text-sm rounded hover:bg-carbon-interactive-hover transition-colors">
            Go to Quiz
          </button>
        </div>
      </div>
    )
  }

  if (!sabCase) {
    return (
      <div className="max-w-2xl space-y-4">
        <BackLink onClick={() => navigate(`/modules/${id}`)} name={module.name} />
        <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-8 text-center">
          <p className="text-sm text-carbon-text-placeholder">No sabotage cases available for this module.</p>
        </div>
      </div>
    )
  }

  const solved     = sab.phase === 'correct'
  const revealed   = sab.phase === 'revealed'
  const dirty      = editorValue !== seed
  const canSubmit  = !sab.verifying && !solved && editorValue.trim().length > 0 &&
                     repoMeta.available !== false && !seedError

  const tabs = [
    { path: sabCase.file, editable: true, language: sabCase.language },
    ...openExtra.filter(p => p !== sabCase.file).map(p => ({ path: p, editable: false })),
  ]

  const submitLabel = sab.verifying ? 'Checking…'
    : solved ? 'Solved ✓'
    : revealed ? 'Check fix'
    : 'Submit Code'

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-up">
      <BackLink onClick={() => navigate(`/modules/${id}`)} name={module.name} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-carbon-sabotage uppercase tracking-wider">Sabotage Mode</span>
            <span className="text-xs px-2 py-0.5 rounded-sm border border-carbon-sabotage/30 text-carbon-sabotage bg-carbon-sabotage-bg font-semibold">
              {sabCase.difficulty}
            </span>
          </div>
          <h2 className="text-xl font-bold text-carbon-text-primary">{module.name} — Bug Hunt</h2>
        </div>
        <Stopwatch />
      </div>

      {/* Isolation notice */}
      <div className="flex items-start gap-3 bg-carbon-layer-02 border border-carbon-border rounded-lg px-4 py-2.5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5 text-carbon-interactive">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
        </svg>
        <p className="text-xs text-carbon-text-secondary leading-relaxed">
          <strong className="text-carbon-text-primary">Isolation notice:</strong> your edits are checked against an
          isolated copy of the module. The real repository is never modified.
        </p>
      </div>

      {/* Workspace — drag the divider to resize; double-click it to reset */}
      <SplitPane
        storageKey="ramp.split.sabotage"
        left={
          <div className="space-y-4 stagger-in">
          {solved ? (
            <div className="card-hover bg-carbon-success-bg border border-carbon-success/30 rounded-lg p-5 text-center space-y-2">
              <p className="text-3xl">🐛</p>
              <p className="text-lg font-bold text-carbon-success">Bug Fixed!</p>
              <p className="text-sm text-carbon-text-secondary">
                Resolved in {sab.attempts} attempt{sab.attempts !== 1 ? 's' : ''}
                {sab.lastResult?.method === 'tests' ? ' — verified by the module test suite.' : '.'}
              </p>
              <div className="flex justify-center gap-3 pt-1">
                <button onClick={() => navigate('/modules')}
                  className="px-4 py-2 bg-carbon-brand text-white text-sm rounded hover:bg-carbon-interactive-hover transition-colors">
                  Back to Modules
                </button>
                <button onClick={() => { sab.reset(); setEditorValue(seed) }}
                  className="px-4 py-2 border border-carbon-border text-carbon-text-secondary text-sm rounded hover:bg-carbon-layer-02 transition-colors">
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Symptom */}
              <div className="card-hover bg-carbon-layer-01 border border-carbon-sabotage/30 border-l-4 border-l-carbon-sabotage rounded-lg p-4">
                <p className="text-xs font-semibold text-carbon-sabotage uppercase tracking-wider mb-2">Observable Symptom</p>
                <p className="text-sm text-carbon-text-primary leading-relaxed font-medium">{sabCase.symptom}</p>
              </div>

              {/* Affected file — revealed after hint 1 */}
              <div className="card-hover bg-carbon-layer-01 border border-carbon-border rounded-lg p-3">
                <p className="text-xs text-carbon-text-placeholder mb-1 font-medium">Affected File</p>
                {sab.hintsRevealed >= 1 || revealed || sab.solution
                  ? <p className="font-mono text-sm text-carbon-interactive break-all">{sabCase.file}</p>
                  : <p className="text-sm text-carbon-text-placeholder italic">Reveal hint 1 to see the file</p>}
              </div>

              {/* Attempts */}
              <div className="card-hover bg-carbon-layer-01 border border-carbon-border rounded-lg p-3 flex items-center justify-between">
                <span className="text-xs text-carbon-text-placeholder font-medium">Attempts</span>
                <span className="flex items-center gap-1.5">
                  {Array.from({ length: sab.MAX_ATTEMPTS }).map((_, i) => (
                    <span key={i} className={`w-2.5 h-2.5 rounded-full ${
                      i < sab.attempts ? 'bg-carbon-error' : 'bg-carbon-layer-03 border border-carbon-border'
                    }`} />
                  ))}
                  <span className="text-xs text-carbon-text-secondary ml-1 tabular-nums">{sab.attempts}/{sab.MAX_ATTEMPTS}</span>
                </span>
              </div>

              {sab.lastResult && !sab.lastResult.passed && (sab.flashWrong || revealed || sab.lastResult.method === 'error' || sab.lastResult.method === 'unavailable') && (
                <div className={`rounded-lg px-4 py-2 text-sm font-medium animate-fade-up border ${
                  sab.lastResult.method === 'error' || sab.lastResult.method === 'unavailable'
                    ? 'bg-carbon-warning-bg border-carbon-warning/30 text-carbon-warning'
                    : 'bg-carbon-error-bg border-carbon-error/30 text-carbon-error'
                }`}>
                  {sab.lastResult.detail || 'Not quite — keep looking'}
                  {!revealed && sab.attemptsLeft > 0 && sab.lastResult.method !== 'error' && sab.lastResult.method !== 'unavailable' && (
                    <span className="text-carbon-text-placeholder font-normal"> · {sab.attemptsLeft} left</span>
                  )}
                </div>
              )}

              <SolutionReveal solution={sab.solution} />
              <AutoHintCard text={sab.autoHint} />

              <HintPanel
                hints={sab.hints}
                revealed={sab.hintsRevealed}
                xpCosts={sab.XP_COSTS}
                onReveal={handleRevealHint}
                xp={xp}
              />

              <KeyFilesBox
                files={module.keyFiles ?? []}
                activePath={activePath}
                onOpen={openReadOnly}
                disabled={repoMeta.available === false}
                title="Key Files"
              />
            </>
          )}
          </div>
        }
        right={
          <IdePanel
            tabs={tabs}
            activePath={activePath}
            onActivePathChange={setActivePath}
            repoAvailable={repoMeta.available}
            editableValue={editorValue}
            onEditableChange={setEditorValue}
            onEditableMount={(editor) => { editorRef.current = editor }}
            editableDirty={dirty}
            onResetEditable={() => setEditorValue(seed)}
            toolbar={
              <button
                onClick={() => sab.submitFix(currentCode())}
                disabled={!canSubmit}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  solved
                    ? 'bg-carbon-success/20 text-carbon-success cursor-default'
                    : 'bg-carbon-brand text-white hover:bg-carbon-interactive-hover disabled:opacity-40'
                }`}
              >
                {submitLabel}
              </button>
            }
            statusBar={
              seedError ? (
                <p className="text-[11px] text-carbon-error">{seedError}</p>
              ) : repoMeta.available === false ? (
                <p className="text-[11px] text-carbon-text-placeholder">Editor needs a <code>ramp generate</code> checkout.</p>
              ) : (
                <p className="text-[11px] text-carbon-text-placeholder">
                  Editing <span className="font-mono text-carbon-text-secondary">{(sabCase.file || '').split('/').pop()}</span>
                  {' '}· fix the bug and press <span className="text-carbon-text-secondary">{revealed ? 'Check fix' : 'Submit Code'}</span>
                  {dirty ? ' · unsaved edits' : ''}
                </p>
              )
            }
          />
        }
      />
    </div>
  )
}

function BackLink({ onClick, name }) {
  return (
    <button onClick={onClick}
      className="text-xs text-carbon-text-placeholder hover:text-carbon-interactive flex items-center gap-1 transition-colors">
      ← Back to {name}
    </button>
  )
}
