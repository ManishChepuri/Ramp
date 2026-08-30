import { useState, useRef, useCallback } from 'react'

const SILENCE_PEAK = 0.015   // max RMS below this ⇒ the mic captured nothing
const MIN_BLOB_BYTES = 1200  // anything smaller isn't a real recording

// Formats IBM Watson Speech to Text can actually read, best first. Safari only
// offers audio/mp4, which Watson rejects — we fall back to it and let the user
// know rather than silently failing.
const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]

function pickRecorderType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
  return PREFERRED_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

/**
 * Browser microphone recorder.
 * Returns controls and state for capturing audio, then POSTing to /api/transcribe.
 *
 * Phases: 'idle' | 'requesting' | 'recording' | 'transcribing' | 'done' | 'error'
 * Also exposes `level` (0–1 live input level) so the UI can show a meter and the
 * user can see their mic is actually working.
 */
export function useAudioRecorder() {
  const [phase, setPhase]           = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError]           = useState(null)
  const [elapsed, setElapsed]       = useState(0)   // seconds
  const [level, setLevel]           = useState(0)   // 0–1

  const mediaRef   = useRef(null)   // MediaRecorder instance
  const chunksRef  = useRef([])
  const timerRef   = useRef(null)
  const audioCtxRef = useRef(null)
  const rafRef     = useRef(null)
  const peakRef    = useRef(0)

  const teardownMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    setLevel(0)
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    setPhase('requesting')
    peakRef.current = 0
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const chosenType = pickRecorderType()
      const recorder = chosenType
        ? new MediaRecorder(stream, { mimeType: chosenType })
        : new MediaRecorder(stream)
      mediaRef.current  = recorder
      chunksRef.current = []

      // ── live input level meter ──────────────────────────────────────────────
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioCtx()
        audioCtxRef.current = ctx
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        src.connect(analyser)
        const buf = new Uint8Array(analyser.fftSize)
        const sample = () => {
          analyser.getByteTimeDomainData(buf)
          let sum = 0
          for (let i = 0; i < buf.length; i += 1) {
            const v = (buf[i] - 128) / 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / buf.length)
          peakRef.current = Math.max(peakRef.current, rms)
          setLevel(Math.min(1, rms * 3))
          rafRef.current = requestAnimationFrame(sample)
        }
        sample()
      } catch {
        /* metering is best-effort — recording still proceeds without it */
      }

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        teardownMeter()

        // Strip any ";codecs=..." parameter — Watson wants the bare container type.
        const rawType = recorder.mimeType || chosenType || 'audio/webm'
        const type = rawType.split(';')[0].trim()
        const blob = new Blob(chunksRef.current, { type })

        if (blob.size < MIN_BLOB_BYTES || peakRef.current < SILENCE_PEAK) {
          setError(
            "We didn't pick up any sound from your microphone. Check that it's unmuted, that the " +
            'right input device is selected, and that this site has microphone permission — then try again.'
          )
          setPhase('error')
          return
        }

        setPhase('transcribing')
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'explain-back.webm')
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
          const data = await res.json().catch(() => ({}))

          if (data.error) {
            setError(data.error)
            setPhase('error')
            return
          }
          if (!data.transcript || !data.transcript.trim()) {
            setError(
              'No speech was recognised in that recording. Try speaking a little louder or closer to ' +
              'the mic, keep it to a quiet room, or use the Written tab.'
            )
            setPhase('error')
            return
          }
          setTranscript(data.transcript)
          setPhase('done')
        } catch {
          setError('Could not reach the transcription service. Use the Written tab instead.')
          setPhase('error')
        }
      }

      recorder.start(250)  // collect chunks every 250ms
      setPhase('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch (e) {
      const msg = e.name === 'NotAllowedError'
        ? 'Microphone access was denied. Allow it for this site in your browser settings, or use the Written tab.'
        : 'Could not access the microphone. Use the Written tab instead.'
      setError(msg)
      setPhase('error')
      teardownMeter()
    }
  }, [teardownMeter])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    teardownMeter()
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stream?.getTracks().forEach(t => t.stop())
      mediaRef.current.stop()
    }
    setPhase('idle')
    setTranscript('')
    setError(null)
    setElapsed(0)
    peakRef.current = 0
    chunksRef.current = []
  }, [teardownMeter])

  const updateTranscript = useCallback((text) => setTranscript(text), [])

  return {
    phase, transcript, error, elapsed, level,
    startRecording, stopRecording, reset, updateTranscript,
  }
}
