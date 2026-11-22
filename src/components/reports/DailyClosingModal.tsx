import React, { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Customer, LedgerTransaction, Shop } from '@/types/ledger'
import { AnalyticsService } from '@/services/ledger/analyticsService'
import { speechRegistry } from '@/services/speech/speechRegistry'
import { formatINR } from '@/lib/money'
import { getTodayDateString } from '@/lib/dates'
import {
  Calendar,
  Volume2,
  Download,
  X,
  TrendingDown,
  TrendingUp,
  Users,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react'

interface DailyClosingModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: LedgerTransaction[]
  customers: Customer[]
  shop: Shop | null
}

export const DailyClosingModal: React.FC<DailyClosingModalProps> = ({
  isOpen,
  onClose,
  transactions,
  customers,
  shop
}) => {
  const { language } = useLanguage()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const todayStr = getTodayDateString()

  if (!isOpen) return null

  const report = AnalyticsService.generateDailyClosingReport(todayStr, transactions, customers, language)
  const isNetCreditIncrease = report.net_delta_paise >= 0

  const handleSpeakSummary = async () => {
    setIsSpeaking(true)
    try {
      const provider = speechRegistry.getActiveProvider()
      const synth = await provider.synthesize({
        text: report.spoken_summary,
        language
      })
      await synth.play()
    } catch (e) {
      console.error('Speech synthesis error:', e)
    } finally {
      setIsSpeaking(false)
    }
  }

  const handlePrintSlip = () => {
    const printContent = `
      <html>
        <head>
          <title>Daily Closing Report - ${report.date}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #17233B; font-size: 13px; line-height: 1.5; }
            h1 { font-size: 20px; color: #253B73; margin-bottom: 4px; }
            .box { background: #F8F7F2; padding: 12px; border-radius: 8px; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .val { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${shop?.name || 'Kirana Store'}</h1>
          <p>दैनिक रोकड़ विवरणी (Daily Closing Statement) • ${report.date}</p>
          <div class="box">
            <div class="row"><span>कुल उधार (Credit):</span><span class="val" style="color: #B42318;">+${formatINR(report.total_credit_paise)}</span></div>
            <div class="row"><span>कुल जमा (Payment):</span><span class="val" style="color: #16794B;">-${formatINR(report.total_payment_paise)}</span></div>
            <div class="row" style="border-top: 1px dashed #ccc; padding-top: 6px; font-weight: bold;">
              <span>नेट बकाया परिवर्तन:</span>
              <span class="val">${isNetCreditIncrease ? '+' : '-'}${formatINR(Math.abs(report.net_delta_paise))}</span>
            </div>
          </div>
          <p>सक्रिय ग्राहक: ${report.active_customers_count} | नए ग्राहक: ${report.new_customers_count}</p>
          <p style="text-align: center; color: #667085; font-size: 10px; margin-top: 20px;">खाताAI प्रमाणित डिजिटल रिपोर्ट</p>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank', 'width=450,height=600')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E3E5E0] space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E5E0]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#253B73] text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#17233B]">दैनिक रोकड़ (Daily Closing)</h2>
              <p className="text-xs text-[#667085] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>तारीख: {report.date}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#667085] hover:bg-[#F8F7F2] rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-200">
            <span className="text-[11px] font-bold text-red-700 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              आज का उधार (Credit)
            </span>
            <p className="text-xl font-black text-[#B42318] mt-1">
              {formatINR(report.total_credit_paise)}
            </p>
            <span className="text-[10px] text-[#667085]">{report.credit_transaction_count} बार उधार गया</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              आज की वसूली (Payment)
            </span>
            <p className="text-xl font-black text-[#16794B] mt-1">
              {formatINR(report.total_payment_paise)}
            </p>
            <span className="text-[10px] text-[#667085]">{report.payment_transaction_count} बार जमा हुआ</span>
          </div>
        </div>

        {/* Net Change Bar */}
        <div className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#E3E5E0] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#17233B]">नेट बाज़ार संतुलन (Net Delta):</span>
            <p className="text-[11px] text-[#667085]">
              {isNetCreditIncrease ? 'बाज़ार में फंसा उधार बढ़ा' : 'बाज़ार से नकद रिकवरी हुई'}
            </p>
          </div>
          <div className="text-right">
            <span className={`text-lg font-black ${isNetCreditIncrease ? 'text-[#B42318]' : 'text-[#16794B]'}`}>
              {isNetCreditIncrease ? '+' : '-'}{formatINR(Math.abs(report.net_delta_paise))}
            </span>
          </div>
        </div>

        {/* Top 3 Credit Customers Today */}
        {report.top_debtors_today.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#17233B]">आज के मुख्य उधार ग्राहक:</span>
            <div className="space-y-1.5">
              {report.top_debtors_today.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 border border-[#E3E5E0]/60">
                  <span className="font-semibold text-[#17233B]">{item.customer_name}</span>
                  <span className="font-bold text-[#B42318]">{formatINR(item.amount_paise)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Engagement */}
        <div className="flex justify-between items-center text-xs text-[#667085] pt-1">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-[#253B73]" />
            आज सक्रिय ग्राहक: <strong>{report.active_customers_count}</strong>
          </span>
          <span>नए ग्राहक: <strong>{report.new_customers_count}</strong></span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={handleSpeakSummary}
            disabled={isSpeaking}
            className="flex-1 py-2.5 px-3 bg-[#087F6E] hover:bg-[#066154] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Volume2 className="w-4 h-4" />
            <span>{isSpeaking ? 'सुना रहा हूँ...' : 'बोलकर सुनें'}</span>
          </button>

          <button
            onClick={handlePrintSlip}
            className="py-2.5 px-4 bg-white hover:bg-slate-50 text-[#253B73] border border-[#E3E5E0] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#087F6E]" />
            <span>पर्ची प्रिंट</span>
          </button>
        </div>
      </div>
    </div>
  )
}
