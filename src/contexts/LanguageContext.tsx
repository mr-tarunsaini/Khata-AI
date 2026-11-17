import React, { createContext, useContext, useState, useEffect } from 'react'
import { SupportedLanguage, TranslationDictionary, translations } from '@/types/i18n'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
  t: TranslationDictionary
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // First-run default is Hindi as specified in PRD
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('khata_ai_lang') as SupportedLanguage
      if (saved && ['hi', 'hi-en', 'en'].includes(saved)) {
        return saved
      }
    }
    return 'hi'
  })

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('khata_ai_lang', lang)
      document.documentElement.lang = lang === 'hi' ? 'hi' : 'en'
    }
  }

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi' : 'en'
  }, [language])

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language]
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
