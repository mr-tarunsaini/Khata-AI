import { SpeechProvider, TranscriptionInput, TranscriptionOutput, SynthesizeInput, SynthesizeOutput } from './SpeechProvider'

export class WebSpeechProvider implements SpeechProvider {
  readonly name = 'web-speech'
  readonly label = 'Browser Web Speech API (Live Mic)'

  private activeRecognition: any = null

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  }

  async streamTranscription(input: TranscriptionInput): Promise<TranscriptionOutput> {
    if (typeof window === 'undefined') {
      throw new Error('Web Speech API is not available on server')
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      throw new Error('Web Speech API is not supported in this browser. Please use Chrome/Edge on Desktop/Android or use Mock Provider.')
    }

    const startTime = performance.now()

    return new Promise((resolve, reject) => {
      try {
        if (this.activeRecognition) {
          this.activeRecognition.stop()
        }

        const recognition = new SpeechRecognition()
        this.activeRecognition = recognition

        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = input.language === 'en' ? 'en-IN' : 'hi-IN'

        let finalTranscript = ''
        let hasResolved = false

        if (input.signal) {
          input.signal.addEventListener('abort', () => {
            recognition.stop()
            if (!hasResolved) {
              reject(new Error('Transcription aborted by user'))
            }
          })
        }

        recognition.onresult = (event: any) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interim += transcript
            }
          }

          if (interim && input.onPartial) {
            input.onPartial(interim)
          }
        }

        recognition.onerror = (event: any) => {
          if (event.error !== 'no-speech' && !hasResolved) {
            hasResolved = true
            reject(new Error(`Speech recognition error: ${event.error}`))
          }
        }

        recognition.onend = () => {
          if (!hasResolved) {
            hasResolved = true
            const latencyMs = Math.round(performance.now() - startTime)
            resolve({
              text: finalTranscript.trim(),
              language: recognition.lang,
              confidence: 0.95,
              latencyMs,
              provider: 'WebSpeechProvider (Live Mic)'
            })
          }
        }

        recognition.start()
      } catch (err) {
        reject(err)
      }
    })
  }

  async synthesize(input: SynthesizeInput): Promise<SynthesizeOutput> {
    const startTime = performance.now()

    const playSpeech = async (): Promise<void> => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return
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

      if (indicVoice) {
        utterance.voice = indicVoice
      }

      window.speechSynthesis.speak(utterance)
    }

    const latencyMs = Math.round(performance.now() - startTime)

    return {
      durationMs: input.text.length * 70,
      latencyMs,
      provider: 'WebSpeechProvider (Indic Voices)',
      play: playSpeech
    }
  }

  stopCapture(): void {
    if (this.activeRecognition) {
      try {
        this.activeRecognition.stop()
      } catch {
        // ignore
      }
      this.activeRecognition = null
    }
  }
}

export const webSpeechProvider = new WebSpeechProvider()
