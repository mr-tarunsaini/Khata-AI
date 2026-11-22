import React, { useState } from 'react'
import { Customer, LedgerTransaction } from '@/types/ledger'
import { AnalyticsService } from '@/services/ledger/analyticsService'
import { speechRegistry } from '@/services/speech/speechRegistry'
import { formatINR } from '@/lib/money'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Users,
  Volume2,
  X
} from 'lucide-react'

interface AnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: LedgerTransaction[]
  customers: Customer[]
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  customers
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false)

  if (!isOpen) return null

  const analytics = AnalyticsService.calculateBusinessAnalytics(transactions, customers)

  const handleSpeakOverview = async () => {
    setIsSpeaking(true)
    const text = `व्यापार विश्लेषण: आपकी दुकान पर कुल ${formatINR(analytics.total_outstanding_paise)} का उधार बाज़ार में है। वसूली दर ${analytics.recovery_rate_percentage} प्रतिशत है। ३० दिन से अधिक पुराने बकायेदार ${analytics.aging_buckets.thirty_plus.count} ग्राहक हैं।`
    try {
      const provider = speechRegistry.getActiveProvider()
      await provider.synthesize({ text, language: 'hi' })
    } catch (e) {
      console.error('Speech synthesis error:', e)
    } finally {
      setIsSpeaking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#E3E5E0] space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E5E0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#087F6E] text-white flex items-center justify-center font-bold">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#17233B]">व्यापार विश्लेषण (AI Analytics)</h2>
              <p className="text-xs text-[#667085]">100% सटीक वित्तीय गणना (Deterministic Math)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#667085] hover:bg-[#F8F7F2] rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Top Level KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#E3E5E0]">
            <span className="text-[11px] font-bold text-[#667085] uppercase">कुल बकाया उधार</span>
            <p className="text-2xl font-black text-[#B42318] mt-1">
              {formatINR(analytics.total_outstanding_paise)}
            </p>
            <span className="text-[10px] text-[#667085]">{analytics.active_debtors_count} बकायेदार ग्राहक</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-800 uppercase">उधार वसूली दर (Recovery)</span>
            <p className="text-2xl font-black text-[#16794B] mt-1">
              {analytics.recovery_rate_percentage}%
            </p>
            <span className="text-[10px] text-emerald-700 font-medium">
              {analytics.recovery_rate_percentage >= 70 ? 'संतोषजनक रिकवरी' : 'फॉलो-अप की आवश्यकता'}
            </span>
          </div>
        </div>

        {/* Debt Aging Buckets */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#17233B] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#253B73]" />
              <span>उधार उम्र वर्गीकरण (Debt Aging Analysis)</span>
            </h3>
            <span className="text-[10px] text-[#667085]">समय के अनुसार</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 0-7 days */}
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700">0–7 दिन (नया)</span>
              <p className="text-sm font-extrabold text-[#17233B] mt-0.5">
                {formatINR(analytics.aging_buckets.zero_to_seven.total_paise)}
              </p>
              <span className="text-[9px] text-[#667085]">{analytics.aging_buckets.zero_to_seven.count} ग्राहक</span>
            </div>

            {/* 8-15 days */}
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-700">8–15 दिन (सामान्य)</span>
              <p className="text-sm font-extrabold text-[#17233B] mt-0.5">
                {formatINR(analytics.aging_buckets.eight_to_fifteen.total_paise)}
              </p>
              <span className="text-[9px] text-[#667085]">{analytics.aging_buckets.eight_to_fifteen.count} ग्राहक</span>
            </div>

            {/* 16-30 days */}
            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200">
              <span className="text-[10px] font-bold text-orange-700">16–30 दिन (तगादा)</span>
              <p className="text-sm font-extrabold text-[#17233B] mt-0.5">
                {formatINR(analytics.aging_buckets.sixteen_to_thirty.total_paise)}
              </p>
              <span className="text-[9px] text-[#667085]">{analytics.aging_buckets.sixteen_to_thirty.count} ग्राहक</span>
            </div>

            {/* 30+ days */}
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
              <span className="text-[10px] font-bold text-red-700 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" />
                30+ दिन (जोखिम)
              </span>
              <p className="text-sm font-extrabold text-[#B42318] mt-0.5">
                {formatINR(analytics.aging_buckets.thirty_plus.total_paise)}
              </p>
              <span className="text-[9px] text-[#667085]">{analytics.aging_buckets.thirty_plus.count} ग्राहक</span>
            </div>
          </div>
        </div>

        {/* Top 5 Debtors List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#17233B] flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#253B73]" />
            <span>अधिकतम बकाया वाले ग्राहक (Top 5 Debtors)</span>
          </h3>

          {analytics.top_debtors.length === 0 ? (
            <p className="text-xs text-[#667085] p-3 text-center bg-slate-50 rounded-xl">
              कोई बकायादार ग्राहक नहीं है।
            </p>
          ) : (
            <div className="space-y-1.5">
              {analytics.top_debtors.map((debtor, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-[#F8F7F2] border border-[#E3E5E0]">
                  <div>
                    <span className="text-xs font-bold text-[#17233B]">{debtor.customer_name}</span>
                    <p className="text-[10px] text-[#667085]">कुल {debtor.transaction_count} लेन-देन</p>
                  </div>
                  <span className="text-sm font-black text-[#B42318]">
                    {formatINR(debtor.balance_paise)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2">
          <button
            onClick={handleSpeakOverview}
            disabled={isSpeaking}
            className="w-full py-2.5 bg-[#253B73] hover:bg-[#1a2b55] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>{isSpeaking ? 'सुना रहा हूँ...' : 'विश्लेषण बोलकर सुनें (Voice Summary)'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
