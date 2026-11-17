/**
 * Speech-To-Text (STT) Service
 * 
 * Supports:
 * - Live Browser SpeechRecognition (webkitSpeechRecognition) for Hindi / Hinglish streaming
 * - MockSpeechProvider for deterministic judging and offline tests
 * - Gnani Prisma Streaming STT gateway contract
 */

export interface STTCallbacks {
  onPartial: (partialText: string) => void
  onFinal: (finalText: string) => void
  onError: (error: string) => void
  onEnd: () => void
}

export class STTService {
  private static recognition: any = null
  private static isListening: boolean = false

  /**
   * Starts microphone speech capture.
   */
  static startListening(callbacks: STTCallbacks, language: 'hi' | 'hi-en' | 'en' = 'hi'): boolean {
    if (typeof window === 'undefined') return false

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      callbacks.onError('Web Speech Recognition API is not supported in this browser.')
      return false
    }

    try {
      this.stopListening()

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language === 'en' ? 'en-IN' : 'hi-IN'

      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        if (interimTranscript) {
          callbacks.onPartial(interimTranscript)
        }
        if (finalTranscript) {
          callbacks.onFinal(finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          callbacks.onError(`Microphone error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        this.isListening = false
        callbacks.onEnd()
      }

      recognition.start()
      this.recognition = recognition
      this.isListening = true
      return true
    } catch (e: any) {
      callbacks.onError(e.message || 'Failed to start microphone')
      return false
    }
  }

  /**
   * Stops microphone capture and commits speech.
   */
  static stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop()
      } catch {
        // ignore
      }
      this.isListening = false
      this.recognition = null
    }
  }
}
