import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Bot, CheckCircle, ShieldCheck, Sparkles, X } from 'lucide-react'

export const AIDisclosureModal: React.FC = () => {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if user has acknowledged the AI disclosure
    const hasSeen = localStorage.getItem('khata_ai_disclosure_seen')
    if (!hasSeen) {
      setIsOpen(true)
    }
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem('khata_ai_disclosure_seen', 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFFFF] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E3E5E0] relative">
        <button
          onClick={handleAcknowledge}
          className="absolute top-4 right-4 text-[#667085] hover:text-[#17233B] p-1.5 rounded-full hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#253B73]/10 flex items-center justify-center text-[#253B73]">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#17233B]">{t.aiDisclosureTitle}</h3>
            <span className="text-xs font-medium text-[#087F6E] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              BOL Bharat Hackathon PS2 Certified
            </span>
          </div>
        </div>

        <div className="bg-[#F8F7F2] p-4 rounded-xl border border-[#E3E5E0] text-sm text-[#17233B] leading-relaxed mb-5">
          <p className="font-medium text-[#253B73] mb-2">{t.aiDisclosureBody}</p>
          <ul className="space-y-2 text-xs text-[#667085] mt-3">
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#087F6E] shrink-0 mt-0.5" />
              <span><strong>वित्तीय सटीकता:</strong> AI केवल आवाज़ समझता है। सभी हिसाब और बैलेंस निश्चित नियमों से 100% सटीक लिखे जाते हैं।</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-[#087F6E] shrink-0 mt-0.5" />
              <span><strong>गोपनीयता:</strong> आपकी दुकान का डेटा पूरी तरह निजी है। ऑडियो का कोई भी अनाधिकृत संग्रह नहीं होता।</span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleAcknowledge}
          className="w-full py-3.5 px-4 bg-[#253B73] hover:bg-[#1a2b55] text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle className="w-5 h-5 text-[#E7A23B]" />
          <span>{t.aiDisclosureAcknowledge}</span>
        </button>
      </div>
    </div>
  )
}
