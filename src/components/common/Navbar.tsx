import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePwa } from '@/contexts/PwaContext'
import { SupportedLanguage } from '@/types/i18n'
import { ConnectivityBadge } from './ConnectivityBadge'
import { Globe, Download, Store, Menu } from 'lucide-react'

interface NavbarProps {
  onToggleSidebar?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { shop, user } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const { isInstallable, installApp } = usePwa()

  const languages: { code: SupportedLanguage; label: string }[] = [
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'hi-en', label: 'Hinglish' },
    { code: 'en', label: 'English' }
  ]

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E3E5E0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Hamburger (mobile/tablet) + Logo */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-[#17233B] hover:bg-[#F8F7F2] transition cursor-pointer"
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#253B73] flex items-center justify-center text-white shadow-xs">
              <span className="font-bold text-lg tracking-wider">खा</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-[#253B73] tracking-tight">KhataAI</span>
                <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.2 rounded-md bg-[#E7A23B]/20 text-[#253B73]">
                  Kirana Voice
                </span>
              </div>
              <p className="text-[11px] text-[#667085] leading-none hidden sm:block">
                {t.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Shop info */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8F7F2] border border-[#E3E5E0]">
          <Store className="w-4 h-4 text-[#087F6E]" />
          <span className="text-xs font-semibold text-[#17233B] truncate max-w-[180px]">
            {shop?.name || 'Sharma Kirana Store'}
          </span>
          <span className="text-[11px] text-[#667085]">
            ({user?.full_name || 'Rajesh Sharma'})
          </span>
        </div>

        {/* Right: Language, PWA Install, Connectivity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <ConnectivityBadge />

          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={installApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#087F6E] hover:bg-[#066154] text-white shadow-xs transition cursor-pointer"
              title="Install KhataAI Progressive Web App"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative inline-flex items-center">
            <Globe className="w-4 h-4 text-[#667085] absolute left-2.5 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="appearance-none pl-8 pr-7 py-1.5 rounded-xl text-xs font-semibold bg-[#F8F7F2] hover:bg-slate-100 text-[#17233B] border border-[#E3E5E0] focus:outline-none focus:ring-2 focus:ring-[#253B73] transition cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  )
}
