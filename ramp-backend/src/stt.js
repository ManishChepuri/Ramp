'use strict'

const fetch = require('node-fetch')
const FormData = require('form-data')
const { getIAMToken } = require('./iam')

const STT_URL = process.env.STT_URL || 'https://api.us-south.speech-to-text.watson.cloud.ibm.com'
const STT_APIKEY = process.env.STT_APIKEY

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

  try {
    const token = await getIAMToken(STT_APIKEY)
    const endpoint = `${STT_URL}/v1/recognize?model=en-US_BroadbandModel&smart_formatting=true`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType || 'audio/webm',
      },
      body: audioBuffer,
    })

    if (!res.ok) {
      console.warn(`[stt] HTTP ${res.status}`)
      return { transcript: '', error: 'Transcription failed. Please type your explanation instead.' }
    }

    const data = await res.json()
    const transcript = data?.results
      ?.map(r => r?.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim()

    return { transcript: transcript || '' }
  } catch (err) {
    console.warn('[stt] error:', err.message)
    return { transcript: '', error: 'Transcription failed. Please type your explanation instead.' }
  }
}

module.exports = { transcribeAudio }
