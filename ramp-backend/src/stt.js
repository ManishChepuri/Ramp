'use strict'

const fetch = require('node-fetch')
const FormData = require('form-data')
const { getIAMToken } = require('./iam')

const STT_URL = process.env.STT_URL || 'https://api.us-south.speech-to-text.watson.cloud.ibm.com'
const STT_APIKEY = process.env.STT_APIKEY

// Container types IBM Watson STT accepts as a request Content-Type. We send the
// bare container (Watson auto-detects the codec inside).
const SUPPORTED = new Set([
  'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp3',
  'audio/flac', 'audio/basic', 'audio/l16', 'audio/mulaw', 'audio/alaw', 'audio/g729',
])

/** Browser mimetype (possibly "audio/webm;codecs=opus") -> a Watson-safe base type, or null. */
function normalizeAudioType(mimeType) {
  const base = String(mimeType || '').split(';')[0].trim().toLowerCase()
  if (!base) return 'audio/webm'
  if (SUPPORTED.has(base)) return base
  if (base === 'audio/x-wav' || base === 'audio/wave') return 'audio/wav'
  if (base === 'audio/opus') return 'audio/ogg'
  return null // audio/mp4, audio/aac, audio/x-m4a, … — Safari records these; Watson can't read them
}

/**
 * Transcribes an audio buffer via IBM Speech-to-Text.
 * Returns { transcript } on success or { transcript: '', error } on failure.
 * Never throws — Dev 2 expects a 200 with an error field, not a 500 (per api-contract.md).
 */
async function transcribeAudio(audioBuffer, mimeType) {
  if (!STT_APIKEY) {
    console.warn('[stt] Missing STT_APIKEY — returning empty transcript')
    return { transcript: '', error: 'Transcription service not configured. Please type your explanation instead.' }
  }

  const bytes = audioBuffer?.length ?? 0
  const contentType = normalizeAudioType(mimeType)
  console.log(`[stt] recognize: ${bytes} bytes, browser type "${mimeType}" -> "${contentType}"`)

  if (!contentType) {
    return {
      transcript: '',
      error: `Your browser recorded audio as "${String(mimeType).split(';')[0]}", which the transcription `
        + 'service cannot read (this is common in Safari). Use Chrome or Firefox for voice, or type your answer in the Written tab.',
    }
  }

  try {
    const token = await getIAMToken(STT_APIKEY)
    const endpoint = `${STT_URL}/v1/recognize?model=en-US_BroadbandModel&smart_formatting=true`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
      },
      body: audioBuffer,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.warn(`[stt] HTTP ${res.status} (sent Content-Type "${contentType}") — ${detail.slice(0, 400)}`)
      return {
        transcript: '',
        error: res.status === 415 || res.status === 400
          ? `The transcription service rejected the "${contentType}" audio (${res.status}). `
            + 'Try Chrome or Firefox for voice, or use the Written tab.'
          : 'Transcription failed. Please type your explanation instead.',
      }
    }

    const data = await res.json()
    const transcript = (data?.results ?? [])
      .map(r => r?.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim()

    if (!transcript) {
      console.warn('[stt] IBM returned 200 with no recognised speech (silent or unclear audio)')
    }
    return { transcript }
  } catch (err) {
    console.warn('[stt] error:', err.message)
    return { transcript: '', error: 'Transcription failed. Please type your explanation instead.' }
  }
}

module.exports = { transcribeAudio }
