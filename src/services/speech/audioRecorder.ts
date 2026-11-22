/**
 * Audio Recording and Stream Capture Utility for KhataAI
 * 
 * Captures microphone audio using Web Audio API and generates real 16-bit
 * mono 16kHz PCM WAV Blobs compatible with Gnani Prisma STT (vachana.ai).
 * 
 * Provides:
 * - Real 16kHz 16-bit mono WAV Blob generation (supported by Gnani STT)
 * - Live volume level metering (0-100) for real-time waveform visualization
 * - Clean teardown of media tracks and audio contexts
 */

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * Encodes Float32Array audio samples into a standard 16-bit linear PCM WAV Blob
 */
export function encodeWAVBlob(samples: Float32Array, sampleRate: number = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  // RIFF identifier
  writeString(view, 0, 'RIFF')
  // file length minus 8
  view.setUint32(4, 36 + samples.length * 2, true)
  // RIFF type
  writeString(view, 8, 'WAVE')
  // format chunk identifier
  writeString(view, 12, 'fmt ')
  // format chunk length
  view.setUint32(16, 16, true)
  // sample format (1 = linear PCM)
  view.setUint16(20, 1, true)
  // channel count (1 = mono)
  view.setUint16(22, 1, true)
  // sample rate
  view.setUint32(24, sampleRate, true)
  // byte rate (sampleRate * 1 channel * 2 bytes)
  view.setUint32(28, sampleRate * 2, true)
  // block align (1 channel * 2 bytes)
  view.setUint16(32, 2, true)
  // bits per sample
  view.setUint16(34, 16, true)
  // data chunk identifier
  writeString(view, 36, 'data')
  // data chunk length
  view.setUint32(40, samples.length * 2, true)

  // Write 16-bit PCM samples (-32768 to 32767)
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

export class AudioRecorder {
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private scriptProcessor: ScriptProcessorNode | null = null
  private pcmChunks: Float32Array[] = []
  private animFrameId: number | null = null

  /**
   * Starts capturing microphone audio.
   * onVolumeChange is called periodically with the live audio volume (0 to 100).
   */
  async startRecording(onVolumeChange?: (volume: number) => void): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser environment.')
    }

    // Re-use active media stream if available for instant 0ms latency
    if (!this.mediaStream || !this.mediaStream.active) {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
    }

    this.pcmChunks = []

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    this.audioContext = new AudioContextClass({ sampleRate: 16000 })

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream)

    // ScriptProcessorNode captures raw PCM floats directly from mic
    const bufferSize = 4096
    this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)
    this.scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
      const channelData = event.inputBuffer.getChannelData(0)
      this.pcmChunks.push(new Float32Array(channelData))
    }

    source.connect(this.scriptProcessor)
    this.scriptProcessor.connect(this.audioContext.destination)

    // Analyser node for live volume metering
    if (onVolumeChange) {
      try {
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
   * Stops recording and returns the captured audio as a 16kHz WAV Blob.
   */
  async stopRecording(): Promise<Blob> {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect()
      } catch {
        // ignore
      }
      this.scriptProcessor = null
    }

    const sampleRate = this.audioContext?.sampleRate || 16000

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close()
      } catch {
        // ignore
      }
      this.audioContext = null
    }

    this.cleanup()

    // Calculate total PCM samples captured
    let totalLength = 0
    for (const chunk of this.pcmChunks) {
      totalLength += chunk.length
    }

    if (totalLength === 0) {
      return encodeWAVBlob(new Float32Array(0), sampleRate)
    }

    // Merge chunks into a single Float32Array
    const merged = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of this.pcmChunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    this.pcmChunks = []
    return encodeWAVBlob(merged, sampleRate)
  }

  /**
   * Aborts recording and discards audio tracks.
   */
  abortRecording(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect()
      } catch {
        // ignore
      }
      this.scriptProcessor = null
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close()
      } catch {
        // ignore
      }
      this.audioContext = null
    }
    this.pcmChunks = []
    this.cleanup()
  }

  private cleanup(): void {
    this.analyser = null
  }

  /**
   * Fully releases hardware microphone tracks
   */
  public releaseMicrophone(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }
    this.analyser = null
  }
}

export const audioRecorder = new AudioRecorder()
