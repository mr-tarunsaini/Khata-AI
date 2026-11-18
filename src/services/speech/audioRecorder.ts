/**
 * Audio Recording and Stream Capture Utility for KhataAI
 * 
 * Captures microphone audio using MediaRecorder and Web Audio API.
 * Provides:
 * - Real audio Blob generation for Gnani Prisma STT
 * - Live volume level metering (0-100) for real-time waveform visualization
 * - Clean teardown of media tracks and audio contexts
 */

export class AudioRecorder {
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private animFrameId: number | null = null

  /**
   * Starts capturing microphone audio.
   * onVolumeChange is called periodically with the live audio volume (0 to 100).
   */
  async startRecording(onVolumeChange?: (volume: number) => void): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser environment.')
    }

    // Request microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      }
    })

    this.audioChunks = []

    // Choose supported MIME type
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
      ? 'audio/ogg;codecs=opus'
      : 'audio/wav'

    this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType })

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data)
      }
    }

    this.mediaRecorder.start(100) // Collect 100ms slices

    // Set up Web Audio API volume analysis if callback provided
    if (onVolumeChange) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        this.audioContext = new AudioContextClass()
        const source = this.audioContext.createMediaStreamSource(this.mediaStream)
        this.analyser = this.audioContext.createAnalyser()
        this.analyser.fftSize = 64
        source.connect(this.analyser)

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount)

        const checkVolume = () => {
          if (!this.analyser) return
          this.analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i]
          }
          const avg = sum / dataArray.length
          const normalized = Math.min(100, Math.round((avg / 128) * 100))
          onVolumeChange(normalized)
          this.animFrameId = requestAnimationFrame(checkVolume)
        }

        checkVolume()
      } catch (err) {
        console.warn('AudioContext volume metering not available:', err)
      }
    }
  }

  /**
   * Stops recording and returns the captured audio Blob.
   */
  async stopRecording(): Promise<Blob> {
    // Cancel volume check loop
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close()
      } catch {
        // ignore
      }
      this.audioContext = null
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup()
        resolve(new Blob(this.audioChunks, { type: 'audio/wav' }))
        return
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/wav'
        const audioBlob = new Blob(this.audioChunks, { type: mimeType })
        this.cleanup()
        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * Aborts recording and discards audio tracks.
   */
  abortRecording(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop()
      } catch {
        // ignore
      }
    }
    this.cleanup()
  }

  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }
    this.mediaRecorder = null
    this.analyser = null
  }
}

export const audioRecorder = new AudioRecorder()
