import { SpeechProvider, TranscriptionInput, TranscriptionOutput, SynthesizeInput, SynthesizeOutput } from './SpeechProvider'

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

        const formData = new FormData()
        if (input.audio instanceof Blob) {
          formData.append('audio', input.audio, 'recording.wav')
        }
        formData.append('language', input.language || 'hi-IN')

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

        // Connect to gateway STT endpoint
        const response = await fetch(`${this.gatewayUrl}/stt/stream`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })

        clearTimeout(timeout)

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: response.statusText }))
          throw new Error(`Gnani Gateway STT error (${response.status}): ${errData.message || response.statusText}`)
        }

        const data = await response.json()
        const latencyMs = Math.round(performance.now() - startTime)

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

      // If gateway returns 204 No Content (meaning credentials not yet set, fall back to browser TTS)
      if (response.status === 204 || !response.ok) {
        return this.synthesizeWithBrowserFallback(input, startTime)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const jsonData = await response.json().catch(() => ({}))
        if (jsonData.fallbackToSpeechSynthesis) {
          return this.synthesizeWithBrowserFallback(input, startTime)
        }
      }

      const audioBlob = await response.blob()
      if (audioBlob.size === 0) {
        return this.synthesizeWithBrowserFallback(input, startTime)
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      const latencyMs = Math.round(performance.now() - startTime)

      const play = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const audio = new Audio(audioUrl)
          audio.onended = () => resolve()
          audio.onerror = (e) => reject(e)
          audio.play().catch(reject)
        })
      }

      return {
        audioBlob,
        audioUrl,
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
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(input.text)
        utterance.lang = input.language === 'en' ? 'en-IN' : 'hi-IN'
        utterance.rate = 1.05

        const voices = window.speechSynthesis.getVoices()
        const indicVoice = voices.find(
          (v) =>
            (input.language !== 'en' && (v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'))) ||
            (input.language === 'en' && v.lang.includes('en-IN'))
        )
        if (indicVoice) utterance.voice = indicVoice
        window.speechSynthesis.speak(utterance)
      }
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
