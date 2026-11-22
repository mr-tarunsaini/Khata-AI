/**
 * Shared Web Audio Player for KhataAI
 * 
 * Solves browser autoplay policy blocks by maintaining an unlocked AudioContext
 * activated on user gestures (mic push, click, keydown).
 * Plays WAV/MP3 audio buffers with zero latency and fallback support.
 */

class SoundPlayer {
  private audioCtx: AudioContext | null = null

  getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.audioCtx = new AudioContextClass()
    }
    return this.audioCtx
  }

  /**
   * Must be called synchronously during a user interaction (pointerdown, touchstart, keydown)
   * to unlock Web Audio playback for the remainder of the session.
   */
  unlock(): void {
    if (typeof window === 'undefined') return
    try {
      const ctx = this.getAudioContext()
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
    } catch {
      // ignore
    }
  }

  /**
   * Plays an audio ArrayBuffer (WAV, MP3) using Web Audio API AudioBufferSourceNode.
   * This bypasses HTML5 media autoplay restrictions once unlocked.
   */
  async playBuffer(buffer: ArrayBuffer): Promise<void> {
    this.unlock()
    const ctx = this.getAudioContext()

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    // decodeAudioData detaches the buffer, so slice a copy
    const copy = buffer.slice(0)
    const audioBuffer = await ctx.decodeAudioData(copy)

    return new Promise((resolve) => {
      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)
      source.onended = () => resolve()
      source.start(0)
    })
  }

  /**
   * Plays an audio Blob, attempting Web Audio API first and falling back to HTML5 Audio element.
   */
  async playBlob(blob: Blob): Promise<void> {
    try {
      const buf = await blob.arrayBuffer()
      await this.playBuffer(buf)
    } catch {
      // Fallback to HTML5 audio element
      const url = URL.createObjectURL(blob)
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url)
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
    }
  }
}

export const soundPlayer = new SoundPlayer()
