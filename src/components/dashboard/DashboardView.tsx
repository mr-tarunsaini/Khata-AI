import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLedger } from '@/contexts/LedgerContext'
import { formatINR } from '@/lib/money'
import { formatFriendlyDate, formatTime } from '@/lib/dates'
import {
  TrendingDown,
  TrendingUp,
  Users,
  AlertCircle,
  Mic,
  ArrowRight,
  Clock,
  Sparkles,
  Receipt
} from 'lucide-react'

interface DashboardViewProps {
  onOpenVoice: () => void
  onOpenCustomers: () => void
  onOpenTransactions: () => void
  onSelectCustomer: (customerId: string) => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenVoice,
  onOpenCustomers,
  onOpenTransactions,
  onSelectCustomer
}) => {
  const { t, language } = useLanguage()
  const {
    customers,
    transactions,
    customerBalances,
    totalOutstandingPaise,
    todayAggregates
  } = useLedger()

  // Top outstanding debtors (positive balance)
  const topDebtors = Array.from(customerBalances.values())
    .filter((b) => b.balance_paise > 0)
    .sort((a, b) => b.balance_paise - a.balance_paise)
    .slice(0, 5)

  // Recent 6 transactions
  const recentTransactions = transactions.slice(0, 6)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Welcome & Quick Voice Hero Banner */}
      <div className="bg-gradient-to-r from-[#253B73] to-[#1a2b55] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#E7A23B] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.tagline}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            आज का डिजिटल खाता
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
            कागज़-कलम छोडिए। माइक दबाकर सीधे बोलें: "रमेश का 340 उधार" और तुरंत हिसाब दर्ज करें।
          </p>
        </div>

        <button
          onClick={onOpenVoice}
          className="z-10 shrink-0 px-6 py-4 bg-[#087F6E] hover:bg-[#066154] text-white font-bold rounded-2xl shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <span className="text-xs text-emerald-100 block">आवाज़ से लिखें</span>
            <span className="text-base font-extrabold">{t.navVoiceKhata}</span>
          </div>
        </button>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E5E0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              {t.totalOutstanding}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-[#B42318]">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#17233B]">
            {formatINR(totalOutstandingPaise)}
          </p>
          <span className="text-[11px] text-[#667085] mt-1 block">
            बाजार में फंसा कुल उधार
          </span>
        </div>

        {/* Today's Credit */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E5E0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              {t.todayCredit}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-[#B42318]">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#B42318]">
            {formatINR(todayAggregates.total_credit_paise)}
          </p>
          <span className="text-[11px] text-[#667085] mt-1 block">
            {todayAggregates.credit_count} बार उधार गया
          </span>
        </div>

        {/* Today's Payments */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E5E0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              {t.todayPayment}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#087F6E]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#087F6E]">
            {formatINR(todayAggregates.total_payment_paise)}
          </p>
          <span className="text-[11px] text-[#667085] mt-1 block">
            {todayAggregates.payment_count} बार पेमेंट मिला
          </span>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-5 border border-[#E3E5E0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">
              {t.totalCustomers}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#253B73]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#17233B]">
            {customers.filter((c) => !c.archived_at).length}
          </p>
          <span className="text-[11px] text-[#667085] mt-1 block">
            दुकान के नियमित ग्राहक
          </span>
        </div>
      </div>

      {/* Main Grid: Recent Transactions & Top Debtors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E5E0]">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#253B73]" />
              <h2 className="text-base font-bold text-[#17233B]">{t.recentActivity}</h2>
            </div>
            <button
              onClick={onOpenTransactions}
              className="text-xs font-semibold text-[#087F6E] hover:text-[#066154] flex items-center gap-1 cursor-pointer"
            >
              <span>{t.viewAll}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-xs text-[#667085] text-center py-8">{t.noTransactionsYet}</p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => {
                const customer = customers.find((c) => c.id === tx.customer_id)
                const isCredit = tx.type === 'CREDIT'
                const isReversal = tx.type === 'REVERSAL'

                return (
                  <div
                    key={tx.id}
                    onClick={() => customer && onSelectCustomer(customer.id)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8F7F2] hover:bg-slate-100 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
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
                        <h3 className="text-sm font-bold text-[#17233B] group-hover:text-[#253B73] transition">
                          {customer?.display_name || 'Grahak'}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-[#667085]">
                          <span>{formatFriendlyDate(tx.effective_date, language)}</span>
                          <span>•</span>
                          <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 bg-white rounded border border-[#E3E5E0]">
                            {tx.source}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-base font-extrabold ${
                          isCredit
                            ? 'text-[#B42318]'
                            : isReversal
                            ? 'text-[#A86408]'
                            : 'text-[#16794B]'
                        }`}
                      >
                        {isCredit ? '+' : isReversal ? '↺ ' : '-'}
                        {formatINR(tx.amount_paise)}
                      </p>
                      <span className="text-[10px] text-[#667085]">
                        {tx.type}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column (1/3): Top Outstanding Customers */}
        <div className="bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E5E0]">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#253B73]" />
              <h2 className="text-base font-bold text-[#17233B]">{t.topDebtors}</h2>
            </div>
            <button
              onClick={onOpenCustomers}
              className="text-xs font-semibold text-[#087F6E] hover:text-[#066154] flex items-center gap-1 cursor-pointer"
            >
              <span>{t.viewAll}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topDebtors.length === 0 ? (
            <p className="text-xs text-[#667085] text-center py-8">कोई उधार बकाया नहीं है</p>
          ) : (
            <div className="space-y-3">
              {topDebtors.map((deb) => (
                <div
                  key={deb.customer_id}
                  onClick={() => onSelectCustomer(deb.customer_id)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F7F2] hover:bg-slate-100 transition cursor-pointer group"
                >
                  <div className="truncate mr-2">
                    <h3 className="text-sm font-bold text-[#17233B] group-hover:text-[#087F6E] transition truncate">
                      {deb.customer_name}
                    </h3>
                    <span className="text-[11px] text-[#667085]">
                      {deb.transaction_count} लेन-देन
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-[#B42318]">
                      {formatINR(deb.balance_paise)}
                    </span>
                    <span className="text-[10px] text-[#667085] block">बाकी</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Voice Prompt Helper Card */}
          <div className="p-4 rounded-2xl bg-[#087F6E]/10 border border-[#087F6E]/20 text-xs text-[#17233B]">
            <p className="font-bold text-[#087F6E] flex items-center gap-1 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              आवाज़ से पूछें (Voice Query)
            </p>
            <p className="text-[11px] text-[#667085]">
              माइक दबाकर बोलें: <em>“रमेश का टोटल कितना है?”</em> या <em>“आज कितना उधार गया?”</em>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
