import { useState, useRef, useCallback } from 'react'

/**
 * Browser microphone recorder.
 * Returns controls and state for capturing audio, then POSTing to /api/transcribe.
 *
 * Phases: 'idle' | 'requesting' | 'recording' | 'transcribing' | 'done' | 'error'
 */
export function useAudioRecorder() {
  const [phase, setPhase]         = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError]         = useState(null)
  const [elapsed, setElapsed]     = useState(0)   // seconds

  const mediaRef   = useRef(null)   // MediaRecorder instance
  const chunksRef  = useRef([])
  const timerRef   = useRef(null)

  const startRecording = useCallback(async () => {
    setError(null)
    setPhase('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRef.current  = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Stop all tracks so the mic indicator clears
        stream.getTracks().forEach(t => t.stop())

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setPhase('transcribing')
        try {
          const formData = new FormData()
          formData.append('audio', blob)
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
          const data = await res.json()
          if (data.error) {
            setError(data.error)
            setPhase('error')
            return
          }
          setTranscript(data.transcript)
          setPhase('done')
        } catch {
          setError('Transcription failed. Use the written input instead.')
          setPhase('error')
        }
      }

      recorder.start(250)  // collect chunks every 250ms
      setPhase('recording')
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch (e) {
      const msg = e.name === 'NotAllowedError'
        ? 'Microphone access denied. Allow it in your browser settings, or use the written input.'
        : 'Could not access microphone. Use the written input instead.'
      setError(msg)
      setPhase('error')
    }
  }, [])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stream?.getTracks().forEach(t => t.stop())
      mediaRef.current.stop()
    }
    setPhase('idle')
    setTranscript('')
    setError(null)
    setElapsed(0)
    chunksRef.current = []
  }, [])

  const updateTranscript = useCallback((text) => setTranscript(text), [])

  return {
    phase, transcript, error, elapsed,
    startRecording, stopRecording, reset, updateTranscript,
  }
}
