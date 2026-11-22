import { SpeechProvider, TranscriptionInput, TranscriptionOutput, SynthesizeInput, SynthesizeOutput } from './SpeechProvider'
import { audioPlayer } from './audioPlayer'

export interface GnaniProviderConfig {
  gatewayUrl?: string
  timeoutMs?: number
  maxRetries?: number
}

export class GnaniSpeechProvider implements SpeechProvider {
  readonly name = 'gnani'
  readonly label = 'Gnani Prisma & Timbre (Gateway)'

  private gatewayUrl: string
  private timeoutMs: number
  private maxRetries: number

  constructor(config: GnaniProviderConfig = {}) {
    this.gatewayUrl = config.gatewayUrl || (import.meta.env.VITE_VOICE_GATEWAY_URL || '/api/voice')
    this.timeoutMs = config.timeoutMs || 10000 // 10 second timeout
    this.maxRetries = config.maxRetries || 2
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 2000)
      const res = await fetch(`${this.gatewayUrl}/health`, { signal: controller.signal })
      clearTimeout(timer)
      return res.ok
    } catch {
      return false
    }
  }

  /**
   * Uploads audio stream/blob to server gateway which proxies to Gnani Prisma STT
   */
  async streamTranscription(input: TranscriptionInput): Promise<TranscriptionOutput> {
    const startTime = performance.now()
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (input.signal?.aborted) {
          throw new Error('Transcription aborted by user')
        }

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

        // Connect to gateway STT endpoint with raw audio stream
        const response = await fetch(`${this.gatewayUrl}/stt/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': input.audio instanceof Blob ? (input.audio.type || 'audio/wav') : 'audio/wav',
            'x-language': input.language || 'hi-IN'
          },
          body: input.audio instanceof Blob ? input.audio : new Blob([], { type: 'audio/wav' }),
          signal: controller.signal
        })

        clearTimeout(timeout)

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: response.statusText }))
          throw new Error(`Gnani Gateway STT error (${response.status}): ${errData.message || response.statusText}`)
        }

        const data = await response.json()
        const latencyMs = Math.round(performance.now() - startTime)

        if (data.error && !data.text) {
          console.warn('Gnani STT notice:', data.error)
        }

        return {
          text: data.text || '',
          language: data.language || input.language,
          confidence: data.confidence || 0.95,
          latencyMs,
          provider: data.provider || 'Gnani Prisma Streaming STT'
        }
      } catch (err: any) {
        lastError = err
        if (input.signal?.aborted) {
          throw err
        }
        // Exponential backoff before retry
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)))
        }
      }
    }

    throw lastError || new Error('Failed to transcribe audio via Gnani Gateway after retries')
  }

  /**
   * Requests TTS audio synthesis from server gateway which proxies to Gnani Timbre
   */
  async synthesize(input: SynthesizeInput): Promise<SynthesizeOutput> {
    const startTime = performance.now()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await fetch(`${this.gatewayUrl}/tts/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input.text,
          language: input.language || 'hi-IN',
          voice: input.voice
        }),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (response.status === 204 || !response.ok) {
        return this.synthesizeWithBrowserFallback(input, startTime)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        return this.synthesizeWithBrowserFallback(input, startTime)
      }

      const audioArrayBuffer = await response.arrayBuffer()
      if (audioArrayBuffer.byteLength === 0) {
        return this.synthesizeWithBrowserFallback(input, startTime)
      }

      const latencyMs = Math.round(performance.now() - startTime)

      const play = async (): Promise<void> => {
        await audioPlayer.playBuffer(audioArrayBuffer, input.text, input.language)
      }

      return {
        audioBuffer: audioArrayBuffer,
        latencyMs,
        provider: 'Gnani Timbre TTS',
        play
      }
    } catch {
      return this.synthesizeWithBrowserFallback(input, startTime)
    }
  }

  private synthesizeWithBrowserFallback(input: SynthesizeInput, startTime: number): SynthesizeOutput {
    const play = async (): Promise<void> => {
      audioPlayer.speakBrowser(input.text, input.language)
    }

    const latencyMs = Math.round(performance.now() - startTime)
    return {
      latencyMs,
      provider: 'Gnani Timbre (Browser Voice Fallback)',
      play
    }
  }
}

export const gnaniSpeechProvider = new GnaniSpeechProvider()
