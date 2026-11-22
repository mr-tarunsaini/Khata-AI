/**
 * Unlocked Audio Player Service for KhataAI
 * 
 * Solves browser autoplay policy restrictions and guarantees audible speech:
 * 1. Initialized/unlocked on user gesture (pointerdown/click/space)
 * 2. Plays synthesized WAV audio directly through Web Audio API (AudioBufferSourceNode)
 * 3. 3-tier fallback strategy:
 *    - Tier 1: Web Audio API AudioBufferSourceNode (unlocked, zero-latency, immune to autoplay blocks)
 *    - Tier 2: HTMLAudioElement with Blob URL
 *    - Tier 3: Browser SpeechSynthesis (native device voice)
 */

class AudioPlayerService {
  private audioContext: AudioContext | null = null
  private currentSource: AudioBufferSourceNode | null = null

  /**
   * Stops any currently playing audio immediately to prevent voice overlap
   */
  stopAll(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch {
        // ignore
      }
      this.currentSource = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }
  }

  /**
   * Permanently unlocks Web Audio playback in the active tab during user gesture.
   */
  unlock(): void {
    if (typeof window === 'undefined') return
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        this.audioContext = new AudioCtx()
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume()
      }
    } catch (e) {
      console.warn('AudioContext unlock warning:', e)
    }
  }

  getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.audioContext) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        this.audioContext = new AudioCtx()
      } catch {
        // ignore
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {})
    }
    return this.audioContext
  }

  /**
   * Plays an audio ArrayBuffer reliably across all browser environments.
   */
  async playBuffer(arrayBuffer: ArrayBuffer, fallbackText?: string, language: string = 'hi-IN'): Promise<void> {
    this.stopAll()

    // Strategy 1: Web Audio API (Permanent unlock, bypasses 5-second transient activation limit)
    const ctx = this.getAudioContext()
    if (ctx) {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }
        // decodeAudioData needs a detached copy of the array buffer
        const bufferCopy = arrayBuffer.slice(0)
        const audioBuffer = await ctx.decodeAudioData(bufferCopy)

        return new Promise<void>((resolve) => {
          const source = ctx.createBufferSource()
          this.currentSource = source
          source.buffer = audioBuffer
          source.connect(ctx.destination)
          source.onended = () => {
            if (this.currentSource === source) {
              this.currentSource = null
            }
            resolve()
          }
          source.start(0)
        })
      } catch (err) {
        console.warn('Web Audio decode failed, falling back to HTMLAudioElement:', err)
      }
    }

    // Strategy 2: HTMLAudioElement with Blob URL
    try {
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.onerror = (e) => {
          URL.revokeObjectURL(url)
          reject(e)
        }
        audio.play().catch(reject)
      })
      return
    } catch (err) {
      console.warn('HTMLAudioElement play failed, falling back to speech synthesis:', err)
    }

    // Strategy 3: Browser SpeechSynthesis Native Fallback
    if (fallbackText) {
      this.speakBrowser(fallbackText, language)
    }
  }

  /**
   * Native device speech synthesis fallback
   */
  speakBrowser(text: string, language: string = 'hi-IN'): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      window.speechSynthesis.resume()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language === 'en' ? 'en-IN' : 'hi-IN'
      utterance.rate = 1.05

      const voices = window.speechSynthesis.getVoices()
      const indicVoice = voices.find(
        (v) =>
          (language !== 'en' && (v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'))) ||
          (language === 'en' && (v.lang.includes('en-IN') || v.lang.startsWith('en')))
      )
      if (indicVoice) utterance.voice = indicVoice
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.error('SpeechSynthesis fallback error:', err)
    }
  }
}

export const audioPlayer = new AudioPlayerService()
