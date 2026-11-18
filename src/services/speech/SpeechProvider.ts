/**
 * Speech Provider Core Interface for KhataAI
 * 
 * Supports modular speech processing architecture:
 * - MockSpeechProvider (Deterministic testing & hackathon judging)
 * - WebSpeechProvider (Browser native streaming Web Speech API)
 * - GnaniSpeechProvider (Gnani Prisma STT & Gnani Timbre TTS via backend gateway)
 */

export interface TranscriptionInput {
  audio?: ReadableStream<Uint8Array> | Blob | null
  language: string // 'hi-IN' | 'hi' | 'en-IN'
  onPartial?: (text: string) => void
  signal?: AbortSignal
}

export interface TranscriptionOutput {
  text: string
  language: string
  confidence: number
  latencyMs: number
  provider: string
}

export interface SynthesizeInput {
  text: string
  language: string
  voice?: string
  signal?: AbortSignal
}

export interface SynthesizeOutput {
  audioBlob?: Blob
  audioUrl?: string
  audioBuffer?: ArrayBuffer
  durationMs?: number
  latencyMs: number
  provider: string
  play: () => Promise<void>
}

export interface SpeechProvider {
  /**
   * Unique name of the speech provider (e.g. 'mock', 'web-speech', 'gnani')
   */
  readonly name: string

  /**
   * Human-readable label for UI badges and settings
   */
  readonly label: string

  /**
   * Checks whether the provider is currently available and ready
   */
  isAvailable(): Promise<boolean>

  /**
   * Streams audio to STT and returns the final transcribed text
   */
  streamTranscription(input: TranscriptionInput): Promise<TranscriptionOutput>

  /**
   * Converts text into spoken audio
   */
  synthesize(input: SynthesizeInput): Promise<SynthesizeOutput>
}

export type ActiveProviderType = 'mock' | 'web-speech' | 'gnani'
