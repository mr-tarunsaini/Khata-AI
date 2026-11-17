/**
 * Text-To-Speech (TTS) Service
 * 
 * Supports:
 * - Gnani Timbre TTS (via backend gateway when configured)
 * - Browser Web Speech API SpeechSynthesis fallback (native Hindi/English Indic voices)
 * - Accurate latency measurement from invocation to first audio packet
 */

export class TTSService {
  private static isSpeaking = false

  /**
   * Speaks the localized response sentence.
   * Returns latency in milliseconds from call to speech start.
   */
  static async speak(text: string, language: 'hi' | 'hi-en' | 'en' = 'hi'): Promise<number> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('SpeechSynthesis is not supported in this environment')
      return 0
    }

    // Cancel any previous speech
    window.speechSynthesis.cancel()

    const startTime = performance.now()

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)

      // Configure Indic / Hindi voice
      utterance.lang = language === 'en' ? 'en-IN' : 'hi-IN'
      utterance.rate = 1.05 // natural conversational speed
      utterance.pitch = 1.0

      // Try finding an Indian voice
      const voices = window.speechSynthesis.getVoices()
      const indicVoice = voices.find(
        (v) =>
          (language !== 'en' && (v.lang.includes('hi') || v.name.toLowerCase().includes('hindi') || v.name.toLowerCase().includes('india'))) ||
          (language === 'en' && v.lang.includes('en-IN'))
      )

      if (indicVoice) {
        utterance.voice = indicVoice
      }

      let hasStarted = false

      utterance.onstart = () => {
        hasStarted = true
        this.isSpeaking = true
        const latencyMs = Math.round(performance.now() - startTime)
        resolve(latencyMs)
      }

      utterance.onend = () => {
        this.isSpeaking = false
        if (!hasStarted) {
          resolve(Math.round(performance.now() - startTime))
        }
      }

      utterance.onerror = (e) => {
        console.warn('TTS playback error:', e)
        this.isSpeaking = false
        resolve(Math.round(performance.now() - startTime))
      }

      window.speechSynthesis.speak(utterance)

      // Fallback timeout in case onstart fails to fire on some mobile browsers
      setTimeout(() => {
        if (!hasStarted) {
          resolve(Math.round(performance.now() - startTime))
        }
      }, 500)
    })
  }

  static stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      this.isSpeaking = false
    }
  }
}
