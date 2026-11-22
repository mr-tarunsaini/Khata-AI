import React, { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLedger } from '@/contexts/LedgerContext'
import { formatINR } from '@/lib/money'
import { formatFriendlyDate, formatTime, getTodayDateString, getRelativeDateString } from '@/lib/dates'
import { PdfReceiptService } from '@/services/receipt/pdfReceiptService'
import { DailyClosingModal } from '@/components/reports/DailyClosingModal'
import {
  Receipt,
  Search,
  Filter,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Download,
  Calendar,
  Sparkles,
  Printer,
  FileSpreadsheet
} from 'lucide-react'

export const TransactionsView: React.FC = () => {
  const { t, language } = useLanguage()
  const { shop } = useAuth()
  const { transactions, customers, reverseTransaction, exportLedgerCsv } = useLedger()

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'CREDIT' | 'PAYMENT' | 'REVERSAL'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false)

  const todayStr = getTodayDateString()
  const yesterdayStr = getRelativeDateString(-1)
  const sevenDaysAgoStr = getRelativeDateString(-7)

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Date filter
      if (dateFilter === 'today' && tx.effective_date !== todayStr) return false
      if (dateFilter === 'yesterday' && tx.effective_date !== yesterdayStr) return false
      if (dateFilter === '7days' && tx.effective_date < sevenDaysAgoStr) return false

      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false

      // Customer search query
      if (searchQuery.trim()) {
        const customer = customers.find((c) => c.id === tx.customer_id)
        const nameMatch = customer?.display_name.toLowerCase().includes(searchQuery.toLowerCase())
        const noteMatch = tx.note?.toLowerCase().includes(searchQuery.toLowerCase())
        if (!nameMatch && !noteMatch) return false
      }

      return true
    })
  }, [transactions, customers, dateFilter, typeFilter, searchQuery, todayStr, yesterdayStr, sevenDaysAgoStr])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#17233B]">
            {t.navTransactions} ({filteredTransactions.length})
          </h1>
          <p className="text-xs text-[#667085]">
            अपरिवर्तनीय डिजिटल खाता बही (Append-Only Ledger)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsClosingModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#253B73] hover:bg-[#1a2b55] text-xs font-bold text-white shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#E7A23B]" />
            <span>दैनिक रोकड़ (Daily Closing)</span>
          </button>

          <button
            onClick={exportLedgerCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E3E5E0] hover:bg-slate-50 text-xs font-bold text-[#253B73] shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#087F6E]" />
            <span>CSV डाउनलोड करें</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E5E0] shadow-xs space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ग्राहक का नाम या टिप्पणी खोजें..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
          />
        </div>

        {/* Date & Type Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E3E5E0]/60">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] font-bold text-[#667085] mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              तारीख:
            </span>
            {(['all', 'today', 'yesterday', '7days'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  dateFilter === d
                    ? 'bg-[#253B73] text-white'
                    : 'bg-[#F8F7F2] text-[#667085] hover:bg-slate-100'
                }`}
              >
                {d === 'all'
                  ? t.allTime
                  : d === 'today'
                  ? t.today
                  : d === 'yesterday'
                  ? t.yesterday
                  : t.last7Days}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#667085] mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              प्रकार:
            </span>
            {(['all', 'CREDIT', 'PAYMENT', 'REVERSAL'] as const).map((tp) => (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  typeFilter === tp
                    ? 'bg-[#087F6E] text-white'
                    : 'bg-[#F8F7F2] text-[#667085] hover:bg-slate-100'
                }`}
              >
                {tp === 'all'
                  ? t.allTypes
                  : tp === 'CREDIT'
                  ? t.creditLabel
                  : tp === 'PAYMENT'
                  ? t.paymentLabel
                  : t.reversalLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-3xl border border-[#E3E5E0] shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-[#667085] text-xs">
            कोई लेन-देन नहीं मिला।
          </div>
        ) : (
          <div className="divide-y divide-[#E3E5E0]">
            {filteredTransactions.map((tx) => {
              const customer = customers.find((c) => c.id === tx.customer_id)
              const isCredit = tx.type === 'CREDIT'
              const isReversal = tx.type === 'REVERSAL'

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-[#F8F7F2]/50 transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCredit
                          ? 'bg-red-100 text-red-700'
                          : isReversal
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isCredit ? (
                        <TrendingDown className="w-5 h-5" />
                      ) : (
                        <TrendingUp className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#17233B]">
                          {customer?.display_name || 'Grahak'}
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 uppercase text-[#253B73]">
                          {tx.source}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#667085] mt-0.5">
                        {formatFriendlyDate(tx.effective_date, language)} • {formatTime(tx.created_at)}
                        {tx.note && ` • ${tx.note}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span
                        className={`text-base sm:text-lg font-black ${
                          isCredit
                            ? 'text-[#B42318]'
                            : isReversal
                            ? 'text-[#A86408]'
                            : 'text-[#16794B]'
                        }`}
                      >
                        {isCredit ? '+' : isReversal ? '↺ ' : '-'}
                        {formatINR(tx.amount_paise)}
                      </span>
                      <span className="text-[10px] text-[#667085] block">
                        {tx.type}
                      </span>
                    </div>

                    {/* Print 80mm Slip */}
                    <button
                      onClick={() => {
                        if (!customer) return
                        const fallbackShop = {
                          id: 'shop-default',
                          name: 'किराना स्टोर',
                          owner_name: 'दुकानदार',
                          timezone: 'Asia/Kolkata',
                          default_language: 'hi' as const,
                          created_at: new Date().toISOString()
                        }
                        PdfReceiptService.printOrDownloadReceipt(
                          tx,
                          customer,
                          shop || fallbackShop,
                          0,
                          tx.amount_paise
                        )
                      }}
                      className="p-2 text-[#667085] hover:text-[#253B73] hover:bg-slate-100 rounded-xl transition cursor-pointer"
                      title="पर्ची प्रिंट करें (Print 80mm Slip)"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {!isReversal && (
                      <button
                        onClick={() => reverseTransaction(tx.id, 'User reversed from ledger table')}
                        className="p-2 text-[#667085] hover:text-[#B42318] hover:bg-red-50 rounded-xl transition cursor-pointer"
                        title="प्रविष्टि रद्द करें (Append Reversal)"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Daily Closing Report Modal */}
      <DailyClosingModal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        transactions={transactions}
        customers={customers}
        shop={shop}
      />
    </div>
  )
}
