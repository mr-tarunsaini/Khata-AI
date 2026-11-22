import { SpeechProvider, ActiveProviderType } from './SpeechProvider'
import { mockSpeechProvider } from './MockSpeechProvider'
import { webSpeechProvider } from './WebSpeechProvider'
import { gnaniSpeechProvider } from './GnaniSpeechProvider'

class SpeechRegistry {
  private activeType: ActiveProviderType = 'gnani'
  private listeners = new Set<(type: ActiveProviderType) => void>()

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('khata_ai_speech_provider') as ActiveProviderType
      if (saved && ['mock', 'web-speech', 'gnani'].includes(saved)) {
        this.activeType = saved
      } else {
        // Default to Gnani Vachana AI (STT & TTS)
        this.activeType = 'gnani'
      }
    }
  }

  getActiveType(): ActiveProviderType {
    return this.activeType
  }

  getActiveProvider(): SpeechProvider {
    switch (this.activeType) {
      case 'gnani':
        return gnaniSpeechProvider
      case 'web-speech':
        return webSpeechProvider
      case 'mock':
      default:
        return mockSpeechProvider
    }
  }

  setActiveType(type: ActiveProviderType): void {
    this.activeType = type
    if (typeof window !== 'undefined') {
      localStorage.setItem('khata_ai_speech_provider', type)
    }
    this.listeners.forEach((fn) => fn(type))
  }

  subscribe(listener: (type: ActiveProviderType) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

export const speechRegistry = new SpeechRegistry()
