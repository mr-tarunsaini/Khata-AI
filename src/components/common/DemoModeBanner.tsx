import React, { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLedger } from '@/contexts/LedgerContext'
import { Sparkles, RotateCcw, Volume2, ChevronDown, ChevronUp, Check } from 'lucide-react'

interface DemoModeBannerProps {
  onSelectScenario?: (transcript: string) => void
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({ onSelectScenario }) => {
  const { t } = useLanguage()
  const { resetDemoData } = useLedger()
  const [isExpanded, setIsExpanded] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const scenarios = [
    { label: '1. Ramesh ka 340 udhaar', text: 'Ramesh ka 340 udhaar', tag: 'Credit' },
    { label: '2. Ramesh ne 200 diye', text: 'Ramesh ne 200 diye', tag: 'Payment' },
    { label: '3. Ramesh ka total?', text: 'Ramesh ka total kitna hai?', tag: 'Balance' },
    { label: '4. Aaj kitna udhaar gaya?', text: 'Aaj kitna udhaar gaya?', tag: 'Daily' },
    { label: '5. Correction: Nahi, 430', text: 'Nahi, 430', tag: 'Correction' },
    { label: '6. Duplicate Ramesh check', text: 'Ramesh ka 500 udhaar', tag: 'Clarify' },
    { label: '7. Relative date: Kal 500 diye', text: 'Kal Ramesh ne 500 diye', tag: 'Relative Date' }
  ]

  const handleReset = async () => {
    await resetDemoData()
    setResetSuccess(true)
    setTimeout(() => setResetSuccess(false), 2500)
  }

  return (
    <div className="bg-[#253B73]/5 border-b border-[#E3E5E0] px-4 py-2.5 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-[#E7A23B] text-[#17233B] tracking-wide text-[10px]">
            <Sparkles className="w-3 h-3" />
            {t.demoBadge}
          </span>
          <span className="text-[#667085] hidden sm:inline">
            {t.demoNotice}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 font-semibold text-[#087F6E] hover:text-[#066154] transition py-1 px-2 rounded-lg hover:bg-emerald-50 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{t.quickVoiceScenarios}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 font-medium text-[#667085] hover:text-[#17233B] py-1 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Reset customers & transactions to initial synthetic state"
          >
            {resetSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">{t.demoDataResetSuccess}</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.resetDemoData}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-[#E3E5E0]/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 animate-fade-in">
          {scenarios.map((sc, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (onSelectScenario) {
                  onSelectScenario(sc.text)
                }
              }}
              className="flex items-center justify-between text-left p-2 rounded-lg bg-white border border-[#E3E5E0] hover:border-[#087F6E] hover:shadow-xs transition group cursor-pointer"
            >
              <div className="truncate mr-2">
                <span className="font-semibold text-[#17233B] group-hover:text-[#087F6E] transition">
                  {sc.label}
                </span>
                <p className="text-[11px] text-[#667085] truncate">“{sc.text}”</p>
              </div>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-slate-100 text-[#253B73] shrink-0">
                {sc.tag}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
