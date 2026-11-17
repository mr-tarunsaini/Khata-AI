import React, { createContext, useContext, useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PwaContextType {
  isOnline: boolean
  isInstallable: boolean
  isInstalled: boolean
  installApp: () => Promise<boolean>
  pendingSyncCount: number
  setPendingSyncCount: (count: number) => void
}

const PwaContext = createContext<PwaContextType | undefined>(undefined)

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState<boolean>(false)
  const [isInstalled, setIsInstalled] = useState<boolean>(false)
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0)

  useEffect(() => {
    // Monitor online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check if running in standalone (installed) mode
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true)
    }

    // Capture PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstallable(false)
      setDeferredPrompt(null)
      return true
    }
    return false
  }

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isInstallable,
        isInstalled,
        installApp,
        pendingSyncCount,
        setPendingSyncCount
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider')
  }
  return context
}
