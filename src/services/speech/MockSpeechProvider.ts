import { SpeechProvider, TranscriptionInput, TranscriptionOutput, SynthesizeInput, SynthesizeOutput } from './SpeechProvider'

export interface ScriptedScenario {
  id: string
  label: string
  fullTranscript: string
  partials: string[]
  expectedIntent: string
  description: string
  simulateFailure?: boolean
}

export const SCRIPTED_DEMO_SCENARIOS: ScriptedScenario[] = [
  {
    id: 'scenario-1',
    label: '1. Ramesh ka 340 udhaar',
    fullTranscript: 'Ramesh ka 340 udhaar',
    partials: ['Ramesh...', 'Ramesh ka...', 'Ramesh ka 340...', 'Ramesh ka 340 udhaar'],
    expectedIntent: 'ADD_CREDIT',
    description: 'Creates ₹340 credit entry for Ramesh Sharma'
  },
  {
    id: 'scenario-2',
    label: '2. Ramesh ne 200 diye',
    fullTranscript: 'Ramesh ne 200 diye',
    partials: ['Ramesh...', 'Ramesh ne...', 'Ramesh ne 200...', 'Ramesh ne 200 diye'],
    expectedIntent: 'RECORD_PAYMENT',
    description: 'Records ₹200 payment reducing balance to ₹140'
  },
  {
    id: 'scenario-3',
    label: '3. Ramesh ka total kitna hai?',
    fullTranscript: 'Ramesh ka total kitna hai?',
    partials: ['Ramesh ka...', 'Ramesh ka total...', 'Ramesh ka total kitna hai?'],
    expectedIntent: 'QUERY_CUSTOMER_BALANCE',
    description: 'Speaks Ramesh balance from deterministic ledger'
  },
  {
    id: 'scenario-4',
    label: '4. Aaj kitna udhaar gaya?',
    fullTranscript: 'Aaj kitna udhaar gaya?',
    partials: ['Aaj kitna...', 'Aaj kitna udhaar...', 'Aaj kitna udhaar gaya?'],
    expectedIntent: 'QUERY_DAILY_CREDIT',
    description: 'Calculates and speaks sum of credits recorded today'
  },
  {
    id: 'scenario-5',
    label: '5. Correction: Nahi, 430',
    fullTranscript: 'Nahi, 430',
    partials: ['Nahi...', 'Nahi, 430'],
    expectedIntent: 'CORRECT_PENDING_TRANSACTION',
    description: 'Corrects previous pending draft to ₹430 without mutating history'
  },
  {
    id: 'scenario-6',
    label: '6. Duplicate Ramesh Disambiguation',
    fullTranscript: 'Ramesh ka 500 udhaar',
    partials: ['Ramesh...', 'Ramesh ka...', 'Ramesh ka 500 udhaar'],
    expectedIntent: 'CLARIFY',
    description: 'Asks clarification: Ramesh Sharma ya Ramesh Gupta?'
  },
  {
    id: 'scenario-7',
    label: '7. Relative Date: Kal 500 diye',
    fullTranscript: 'Kal Ramesh ne 500 diye',
    partials: ['Kal...', 'Kal Ramesh...', 'Kal Ramesh ne 500 diye'],
    expectedIntent: 'RECORD_PAYMENT',
    description: 'Records payment with effective date resolved to yesterday'
  },
  {
    id: 'scenario-8',
    label: '8. Provider Outage Simulation',
    fullTranscript: 'Suresh ka 100 udhaar',
    partials: ['Connecting...'],
    expectedIntent: 'ERROR',
    description: 'Simulates network/provider error with graceful retry fallback',
    simulateFailure: true
  }
]

export class MockSpeechProvider implements SpeechProvider {
  readonly name = 'mock'
  readonly label = 'DEMO MOCK PROVIDER'

  private currentScenarioIndex = 0
  private forcedScenario: ScriptedScenario | null = null

  async isAvailable(): Promise<boolean> {
    return true
  }

  setScenario(scenarioId: string): void {
    const found = SCRIPTED_DEMO_SCENARIOS.find((s) => s.id === scenarioId)
    if (found) {
      this.forcedScenario = found
    }
  }

  setScenarioByTranscript(transcript: string): void {
    const found = SCRIPTED_DEMO_SCENARIOS.find(
      (s) => s.fullTranscript.toLowerCase() === transcript.trim().toLowerCase()
    )
    if (found) {
      this.forcedScenario = found
    } else {
      // Create ad-hoc scripted scenario
      this.forcedScenario = {
        id: `adhoc-${Date.now()}`,
        label: transcript,
        fullTranscript: transcript,
        partials: [transcript.slice(0, Math.floor(transcript.length / 2)) + '...', transcript],
        expectedIntent: 'CUSTOM',
        description: 'Ad-hoc mock scenario'
      }
    }
  }

  clearForcedScenario(): void {
    this.forcedScenario = null
  }

  async streamTranscription(input: TranscriptionInput): Promise<TranscriptionOutput> {
    const startTime = performance.now()

    const scenario =
      this.forcedScenario ||
      SCRIPTED_DEMO_SCENARIOS[this.currentScenarioIndex % SCRIPTED_DEMO_SCENARIOS.length]

    // Advance to next for cycling if not forced
    if (!this.forcedScenario) {
      this.currentScenarioIndex++
    }

    if (scenario.simulateFailure) {
      await new Promise((r) => setTimeout(r, 600))
      throw new Error('Gnani Gateway Timeout (Simulated Error): Service unreachable, please retry.')
    }

    // Stream realistic partials with delays
    for (const partial of scenario.partials) {
      if (input.signal?.aborted) {
        throw new Error('Transcription aborted by user')
      }
      await new Promise((r) => setTimeout(r, 180))
      if (input.onPartial) {
        input.onPartial(partial)
      }
    }

    const latencyMs = Math.round(performance.now() - startTime)

    return {
      text: scenario.fullTranscript,
      language: input.language || 'hi-IN',
      confidence: 0.98,
      latencyMs,
      provider: 'MockSpeechProvider (DEMO MODE)'
    }
  }

  async synthesize(input: SynthesizeInput): Promise<SynthesizeOutput> {
    const startTime = performance.now()

    // Use Web Speech API for playback if in browser, so user hears actual audio even in demo mode
    const playSpeech = async (): Promise<void> => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(input.text)
        utterance.lang = input.language === 'en' ? 'en-IN' : 'hi-IN'
        utterance.rate = 1.05
        window.speechSynthesis.speak(utterance)
      }
    }

    const latencyMs = Math.round(performance.now() - startTime)

    return {
      durationMs: input.text.length * 75,
      latencyMs,
      provider: 'MockSpeechProvider (DEMO MODE)',
      play: playSpeech
    }
  }
}

export const mockSpeechProvider = new MockSpeechProvider()
