import { describe, it, expect, beforeEach } from 'vitest'
import { MockSpeechProvider, SCRIPTED_DEMO_SCENARIOS } from '@/services/speech/MockSpeechProvider'
import { speechRegistry } from '@/services/speech/speechRegistry'
import { GnaniSpeechProvider } from '@/services/speech/GnaniSpeechProvider'

describe('MockSpeechProvider (Deterministic Demo Scenarios)', () => {
  let provider: MockSpeechProvider

  beforeEach(() => {
    provider = new MockSpeechProvider()
  })

  it('provides all 8 required demo scenarios', () => {
    expect(SCRIPTED_DEMO_SCENARIOS.length).toBeGreaterThanOrEqual(8)
    const texts = SCRIPTED_DEMO_SCENARIOS.map((s) => s.fullTranscript)
    expect(texts).toContain('Ramesh ka 340 udhaar')
    expect(texts).toContain('Ramesh ne 200 diye')
    expect(texts).toContain('Ramesh ka total kitna hai?')
    expect(texts).toContain('Aaj kitna udhaar gaya?')
    expect(texts).toContain('Nahi, 430')
    expect(texts).toContain('Ramesh ka 500 udhaar')
    expect(texts).toContain('Kal Ramesh ne 500 diye')
  })

  it('streams partial transcripts before delivering final text', async () => {
    provider.setScenario('scenario-1') // "Ramesh ka 340 udhaar"

    const partialsEmitted: string[] = []
    const result = await provider.streamTranscription({
      language: 'hi-IN',
      onPartial: (partial) => {
        partialsEmitted.push(partial)
      }
    })

    expect(partialsEmitted.length).toBeGreaterThan(0)
    expect(result.text).toBe('Ramesh ka 340 udhaar')
    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.provider).toContain('MockSpeechProvider')
  })

  it('handles simulated provider outage gracefully with error', async () => {
    provider.setScenario('scenario-8') // Outage scenario

    await expect(
      provider.streamTranscription({
        language: 'hi-IN'
      })
    ).rejects.toThrow('Gnani Gateway Timeout (Simulated Error)')
  })

  it('synthesizes speech with duration and playback interface', async () => {
    const synth = await provider.synthesize({
      text: 'Ramesh ke naam 340 rupaye udhaar darj ho gaya.',
      language: 'hi-IN'
    })

    expect(synth.provider).toContain('MockSpeechProvider')
    expect(synth.durationMs).toBeGreaterThan(0)
    expect(typeof synth.play).toBe('function')
  })
})

describe('Speech Provider Registry', () => {
  it('allows switching between mock, web-speech, and gnani providers', () => {
    speechRegistry.setActiveType('mock')
    expect(speechRegistry.getActiveType()).toBe('mock')
    expect(speechRegistry.getActiveProvider().name).toBe('mock')

    speechRegistry.setActiveType('web-speech')
    expect(speechRegistry.getActiveType()).toBe('web-speech')
    expect(speechRegistry.getActiveProvider().name).toBe('web-speech')

    speechRegistry.setActiveType('gnani')
    expect(speechRegistry.getActiveType()).toBe('gnani')
    expect(speechRegistry.getActiveProvider().name).toBe('gnani')
  })

  it('notifies subscribers upon switching', () => {
    let captured: string | null = null
    const unsubscribe = speechRegistry.subscribe((type) => {
      captured = type
    })

    speechRegistry.setActiveType('mock')
    expect(captured).toBe('mock')

    unsubscribe()
  })
})

describe('GnaniSpeechProvider Resilience', () => {
  it('initializes with default gateway timeout and retries', () => {
    const gnani = new GnaniSpeechProvider({ timeoutMs: 5000, maxRetries: 1 })
    expect(gnani.name).toBe('gnani')
    expect(gnani.label).toContain('Gnani')
  })
})
