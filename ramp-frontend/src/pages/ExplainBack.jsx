import { useParams, useNavigate }   from 'react-router-dom'
import { useState, useEffect }      from 'react'
import { useManifest }              from '../context/ManifestContext'
import { useProgress }              from '../context/ProgressContext'
import { useExplainBack }           from '../hooks/useExplainBack'
import { useAudioRecorder }         from '../hooks/useAudioRecorder'
import { LoadingSpinner }           from '../components/ui/index'

// ── Elapsed timer display MM:SS ───────────────────────────────────────────────
function Timer({ seconds }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <span className="font-mono text-sm font-semibold text-carbon-text-primary tabular-nums">
      {mm}:{ss}
    </span>
  )
}

// ── Mic button with recording ring ────────────────────────────────────────────
function MicButton({ recording, onStart, onStop, disabled }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={recording ? onStop : onStart}
        disabled={disabled}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 ${
          recording
            ? 'bg-carbon-error scale-110'
            : 'bg-carbon-brand hover:bg-carbon-interactive-hover'
        }`}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
      >
        {/* Pulse ring while recording */}
        {recording && (
          <span className="absolute inset-0 rounded-full bg-carbon-error animate-ping opacity-40" />
        )}
        {/* Mic icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="relative z-10">
          {recording ? (
            // Stop square
            <rect x="6" y="6" width="12" height="12" rx="2" fill="white" />
          ) : (
            // Mic
            <>
              <rect x="9" y="2" width="6" height="12" rx="3" stroke="white" strokeWidth="2"/>
              <path d="M5 10a7 7 0 0014 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="19" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="8"  y1="22" x2="16" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </>
          )}
        </svg>
      </button>
      <span className="text-xs text-carbon-text-placeholder">
        {recording ? 'Recording — click to stop' : 'Click to speak'}
      </span>
    </div>
  )
}

// ── Gap analysis result ───────────────────────────────────────────────────────
function GapAnalysis({ result }) {
  return (
    <div className="space-y-4 animate-fade-up">
      {/* Score header */}
      <div className="flex items-center gap-4 bg-carbon-layer-01 border border-carbon-border rounded-lg p-4">
        <div className="text-center flex-shrink-0">
          <p className="font-mono text-4xl font-bold text-carbon-text-primary leading-none">
            {result.score}
          </p>
          <p className="font-mono text-sm text-carbon-text-secondary">/100</p>
        </div>
        <div className="flex-1">
          <div className="h-2 bg-carbon-layer-02 rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-carbon-brand rounded-full transition-all duration-700"
              style={{ width: `${result.score}%` }}
            />
          </div>
          <p className="text-xs text-carbon-text-placeholder">Comprehension score</p>
        </div>
        <div className={`text-sm font-semibold ${result.score >= 80 ? 'text-carbon-success' : 'text-carbon-text-secondary'}`}>
          {result.score >= 80 ? '✓ Passed' : 'Needs improvement'}
        </div>
      </div>

      {/* Covered / Missed */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-carbon-success-bg border border-carbon-success/20 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-carbon-success uppercase tracking-wider mb-2 flex items-center gap-1">
            <span>✓</span> Concepts Covered
          </h4>
          {result.covered.length === 0 ? (
            <p className="text-xs text-carbon-text-placeholder">None identified</p>
          ) : (
            <ul className="space-y-1.5">
              {result.covered.map((c, i) => (
                <li key={i} className="text-sm text-carbon-success flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">✓</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-carbon-error-bg border border-carbon-error/20 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-carbon-error uppercase tracking-wider mb-2 flex items-center gap-1">
            <span>✗</span> Concepts Missed
          </h4>
          {result.missed.length === 0 ? (
            <p className="text-xs text-carbon-text-placeholder">None — great job!</p>
          ) : (
            <ul className="space-y-1.5">
              {result.missed.map((c, i) => (
                <li key={i} className="text-sm text-carbon-error flex items-start gap-2">
                  <span className="flex-shrink-0 mt-0.5">✗</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Misconceptions */}
      {result.misconceptions?.length > 0 && (
        <div className="bg-carbon-warning-bg border border-carbon-warning/20 rounded-lg p-3 space-y-1">
          <h4 className="text-xs font-semibold text-carbon-warning uppercase tracking-wider mb-2">
            ⚠ Misconceptions Identified
          </h4>
          {result.misconceptions.map((m, i) => (
            <p key={i} className="text-sm text-carbon-warning leading-snug">{m}</p>
          ))}
        </div>
      )}

      {/* Feedback */}
      <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-4">
        <h4 className="text-xs font-semibold text-carbon-text-placeholder uppercase tracking-wider mb-2">
          Feedback
        </h4>
        <p className="text-sm text-carbon-text-secondary leading-relaxed">{result.feedback}</p>
      </div>
    </div>
  )
}

// ── Written tab ───────────────────────────────────────────────────────────────
function WrittenTab({ phase, result, error, onSubmit, onReset }) {
  const [text, setText] = useState('')

  return (
    <div className="space-y-3">
      {phase !== 'result' && (
        <>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            placeholder="Type your explanation here…"
            className="w-full bg-carbon-layer-01 border border-carbon-border rounded-lg p-4 text-sm text-carbon-text-primary placeholder-carbon-text-placeholder focus:border-carbon-interactive focus:outline-none resize-y font-sans leading-relaxed"
          />
          <div className="flex items-center gap-3">
            <button
              disabled={!text.trim() || phase === 'submitting'}
              onClick={() => onSubmit(text)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-carbon-brand text-white text-sm font-medium rounded disabled:opacity-40 hover:bg-carbon-interactive-hover transition-colors"
            >
              {phase === 'submitting' && <LoadingSpinner size="sm" />}
              {phase === 'submitting' ? 'Grading…' : 'Submit Explanation'}
            </button>
            <span className="text-xs text-carbon-text-placeholder">{text.length} chars</span>
          </div>
        </>
      )}

      {error && (
        <div className="bg-carbon-error-bg border border-carbon-error/30 rounded-lg p-4 text-sm text-carbon-error">
          {error}
          <button onClick={onReset} className="ml-3 underline hover:no-underline text-xs">Try again</button>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-carbon-text-primary">Gap Analysis</h3>
            <button onClick={onReset} className="text-xs text-carbon-interactive hover:underline">
              Try again
            </button>
          </div>
          <GapAnalysis result={result} />
        </div>
      )}
    </div>
  )
}

// ── Voice tab ─────────────────────────────────────────────────────────────────
function VoiceTab({ module, onGradeResult }) {
  const rec = useAudioRecorder()
  const eb  = useExplainBack()

  // Once grading finishes, bubble result up so awards can fire
  useEffect(() => {
    if (eb.phase === 'result' && eb.result) {
      onGradeResult(eb.result)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eb.phase])

  function handleSubmitTranscript() {
    eb.submit(module.id, rec.transcript, module.explainBack?.rubric)
  }

  return (
    <div className="space-y-5">
      {/* Interview framing */}
      <div className="bg-carbon-layer-02 border border-carbon-border rounded-lg p-4 flex items-start gap-3">
        <span className="text-carbon-text-placeholder text-lg flex-shrink-0">🎙</span>
        <div>
          <p className="text-xs font-semibold text-carbon-text-secondary uppercase tracking-wider mb-0.5">
            Architecture Interview Mode
          </p>
          <p className="text-sm text-carbon-text-secondary leading-snug">
            Explain the module as if you're in a technical interview. Speak naturally — you'll see the transcript before it's graded.
          </p>
        </div>
      </div>

      {/* Idle / requesting */}
      {(rec.phase === 'idle' || rec.phase === 'requesting') && (
        <div className="flex flex-col items-center gap-4 py-8">
          <MicButton
            recording={false}
            onStart={rec.startRecording}
            disabled={rec.phase === 'requesting'}
          />
          {rec.phase === 'requesting' && (
            <p className="text-xs text-carbon-text-placeholder">Requesting microphone access…</p>
          )}
        </div>
      )}

      {/* Recording */}
      {rec.phase === 'recording' && (
        <div className="flex flex-col items-center gap-5 py-6">
          <MicButton recording onStop={rec.stopRecording} />
          <div className="flex items-center gap-3 bg-carbon-layer-01 border border-carbon-error/30 rounded-lg px-5 py-3">
            <span className="w-2 h-2 rounded-full bg-carbon-error animate-pulse flex-shrink-0" />
            <span className="text-xs text-carbon-text-secondary">Recording</span>
            <Timer seconds={rec.elapsed} />
          </div>
          <p className="text-xs text-carbon-text-placeholder text-center max-w-xs">
            Click stop when you're done. You'll be able to review and correct the transcript before submitting.
          </p>
        </div>
      )}

      {/* Transcribing */}
      {rec.phase === 'transcribing' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-carbon-text-secondary">Transcribing your explanation…</p>
        </div>
      )}

      {/* Transcript review */}
      {rec.phase === 'done' && eb.phase !== 'result' && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-carbon-text-primary">Transcript Review</h4>
            <button
              onClick={rec.reset}
              className="text-xs text-carbon-text-placeholder hover:text-carbon-interactive transition-colors"
            >
              ↺ Re-record
            </button>
          </div>
          <p className="text-xs text-carbon-text-placeholder">
            Correct any transcription errors before submitting for grading.
          </p>
          <textarea
            value={rec.transcript}
            onChange={e => rec.updateTranscript(e.target.value)}
            rows={7}
            className="w-full bg-carbon-layer-01 border border-carbon-border rounded-lg p-4 text-sm text-carbon-text-primary focus:border-carbon-interactive focus:outline-none resize-y font-sans leading-relaxed"
          />
          <div className="flex items-center gap-3">
            <button
              disabled={!rec.transcript.trim() || eb.phase === 'submitting'}
              onClick={handleSubmitTranscript}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-carbon-brand text-white text-sm font-medium rounded disabled:opacity-40 hover:bg-carbon-interactive-hover transition-colors"
            >
              {eb.phase === 'submitting' && <LoadingSpinner size="sm" />}
              {eb.phase === 'submitting' ? 'Grading…' : 'Submit for Grading'}
            </button>
          </div>
        </div>
      )}

      {/* Grading result */}
      {eb.phase === 'result' && eb.result && (
        <div className="space-y-4 animate-fade-up">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-carbon-text-primary">Gap Analysis</h3>
            <button
              onClick={() => { rec.reset(); eb.reset() }}
              className="text-xs text-carbon-interactive hover:underline"
            >
              Try again
            </button>
          </div>
          <GapAnalysis result={eb.result} />
        </div>
      )}

      {/* Error */}
      {(rec.phase === 'error' || eb.phase === 'error') && (
        <div className="bg-carbon-error-bg border border-carbon-error/30 rounded-lg p-4 text-sm text-carbon-error space-y-2">
          <p>{rec.error ?? eb.error}</p>
          <button
            onClick={() => { rec.reset(); eb.reset() }}
            className="text-xs underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExplainBack({ addToast }) {
  const { id }       = useParams()
  const { manifest } = useManifest()
  const { awardBadge, awardXp, certifyModule, earnedBadges } = useProgress()
  const navigate     = useNavigate()

  const { phase, result, error, submit, reset } = useExplainBack()
  const [text, setText]   = useState('')
  const [activeTab, setActiveTab] = useState('written')  // 'written' | 'voice'

  const module = manifest?.modules?.find(m => m.id === id)
  if (!module) return <p className="text-carbon-text-placeholder">Module not found.</p>

  const eb = module.explainBack

  function handleAwards(r) {
    if (!r) return
    if (r.score >= 80) {
      certifyModule(module.id)
      awardXp(75)
      addToast?.({ message: `✓ Explain-back passed! +75 XP`, type: 'xp' })
      if (!earnedBadges.includes('in-your-words')) {
        awardBadge('in-your-words')
        addToast?.({ message: '🏅 Badge: In Your Own Words', type: 'badge' })
      }
    }
  }

  // Fire awards when written path finishes
  useEffect(() => {
    if (phase === 'result' && result) handleAwards(result)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  return (
    <div className="max-w-2xl space-y-5 animate-fade-up">
      {/* Back + title */}
      <div>
        <button
          onClick={() => navigate(`/modules/${id}`)}
          className="text-xs text-carbon-text-placeholder hover:text-carbon-interactive mb-3 flex items-center gap-1 transition-colors"
        >
          ← Back to {module.name}
        </button>
        <h2 className="text-xl font-bold text-carbon-text-primary">Explain Back</h2>
        <p className="text-sm text-carbon-text-secondary mt-0.5">{module.name}</p>
      </div>

      {/* Prompt card */}
      <div className="bg-carbon-layer-01 border border-carbon-border rounded-lg p-4">
        <p className="text-xs text-carbon-text-placeholder uppercase tracking-wider mb-2 font-medium">Your Prompt</p>
        <p className="text-base text-carbon-text-primary leading-relaxed">{eb?.prompt}</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-carbon-border">
        {[
          { key: 'written', label: '✏ Written' },
          { key: 'voice',   label: '🎙 Voice' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-carbon-brand text-carbon-text-primary'
                : 'border-transparent text-carbon-text-secondary hover:text-carbon-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-carbon-text-placeholder self-center pr-1">
          Written always available
        </span>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'written' && (
          <WrittenTab
            phase={phase}
            result={result}
            error={error}
            onSubmit={t => submit(module.id, t, eb?.rubric)}
            onReset={reset}
          />
        )}
        {activeTab === 'voice' && (
          <VoiceTab
            module={module}
            onGradeResult={handleAwards}
          />
        )}
      </div>
    </div>
  )
}
