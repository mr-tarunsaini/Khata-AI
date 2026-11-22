import React, { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLedger } from '@/contexts/LedgerContext'
import { Customer, LedgerTransaction, Shop } from '@/types/ledger'
import { formatINR } from '@/lib/money'
import { formatFriendlyDate } from '@/lib/dates'
import { PdfReceiptService } from '@/services/receipt/pdfReceiptService'
import {
  Users,
  Search,
  UserPlus,
  Phone,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Receipt,
  RotateCcw,
  Edit2,
  Archive,
  Check,
  X,
  Tag,
  Plus,
  Printer,
  FileText
} from 'lucide-react'

interface CustomersViewProps {
  selectedCustomerId: string | null
  onSelectCustomer: (id: string | null) => void
  onOpenVoice: () => void
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  selectedCustomerId,
  onSelectCustomer,
  onOpenVoice
}) => {
  const { t, language } = useLanguage()
  const { shop } = useAuth()
  const {
    customers,
    transactions,
    customerBalances,
    addCustomer,
    editCustomer,
    archiveCustomer,
    addTransaction,
    reverseTransaction,
    addCustomerAlias,
    removeCustomerAlias
  } = useLedger()

  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newAlias, setNewAlias] = useState('')

  // Alias state inside customer detail
  const [aliasInput, setAliasInput] = useState('')
  const [isAddingAlias, setIsAddingAlias] = useState(false)

  // Quick transaction modal for customer detail
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false)
  const [quickAmountRupees, setQuickAmountRupees] = useState('')
  const [quickTxType, setQuickTxType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT')

  const activeCustomers = customers.filter(
    (c) =>
      !c.archived_at &&
      (c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)))
  )

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : null

  const selectedCustomerTransactions = selectedCustomerId
    ? transactions.filter((tx) => tx.customer_id === selectedCustomerId)
    : []

  const selectedBalance = selectedCustomerId
    ? customerBalances.get(selectedCustomerId)
    : null

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const created = await addCustomer(newName, newPhone, newNotes)
    if (newAlias.trim()) {
      await addCustomerAlias(created.id, newAlias.trim())
    }
    setNewName('')
    setNewPhone('')
    setNewNotes('')
    setNewAlias('')
    setIsAddModalOpen(false)
    onSelectCustomer(created.id)
  }

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || !aliasInput.trim()) return
    await addCustomerAlias(selectedCustomer.id, aliasInput.trim())
    setAliasInput('')
    setIsAddingAlias(false)
  }

  const handleRemoveAlias = async (alias: string) => {
    if (!selectedCustomer) return
    await removeCustomerAlias(selectedCustomer.id, alias)
  }

  const handlePrintStatement = () => {
    if (!selectedCustomer) return
    const fallbackShop: Shop = {
      id: 'shop-default',
      name: 'किराना स्टोर',
      owner_name: 'दुकानदार',
      timezone: 'Asia/Kolkata',
      default_language: 'hi',
      created_at: new Date().toISOString()
    }
    PdfReceiptService.printOrDownloadCustomerLedgerPdf(
      selectedCustomer,
      selectedCustomerTransactions,
      shop || fallbackShop,
      selectedBalance?.balance_paise || 0
    )
  }

  const handlePrintSlip = (tx: LedgerTransaction) => {
    if (!selectedCustomer) return
    const currentBal = selectedBalance?.balance_paise || 0
    const isCredit = tx.type === 'CREDIT'
    const prevBal = isCredit ? currentBal - tx.amount_paise : currentBal + tx.amount_paise
    const fallbackShop: Shop = {
      id: 'shop-default',
      name: 'किराना स्टोर',
      owner_name: 'दुकानदार',
      timezone: 'Asia/Kolkata',
      default_language: 'hi',
      created_at: new Date().toISOString()
    }
    PdfReceiptService.printOrDownloadReceipt(
      tx,
      selectedCustomer,
      shop || fallbackShop,
      prevBal,
      currentBal
    )
  }

  const handleAddQuickTx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer || !quickAmountRupees.trim()) return
    const rupees = parseFloat(quickAmountRupees)
    if (isNaN(rupees) || rupees <= 0) return

    await addTransaction({
      customer_id: selectedCustomer.id,
      type: quickTxType,
      amount_paise: Math.round(rupees * 100),
      effective_date: new Date().toISOString().slice(0, 10),
      source: 'MANUAL',
      note: 'Manual entry'
    })

    setQuickAmountRupees('')
    setIsQuickTxOpen(false)
  }

  // --- 1. Customer Detail View ---
  if (selectedCustomer) {
    const balPaise = selectedBalance?.balance_paise || 0
    const isDebtor = balPaise > 0

    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Back Button & Customer Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onSelectCustomer(null)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E3E5E0] text-xs font-bold text-[#17233B] hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>वापस (Back to list)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintStatement}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#253B73]/10 hover:bg-[#253B73]/20 text-xs font-bold text-[#253B73] transition cursor-pointer"
              title="पूरा खाता विवरणी PDF में प्रिंट/डाउनलोड करें"
            >
              <FileText className="w-4 h-4" />
              <span>खाता पर्ची (PDF Statement)</span>
            </button>

            <button
              onClick={() => archiveCustomer(selectedCustomer.id)}
              className="text-xs font-semibold text-[#B42318] hover:underline flex items-center gap-1 cursor-pointer ml-2"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{t.archiveCustomer}</span>
            </button>
          </div>
        </div>

        {/* Customer Balance Banner Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-[#17233B]">
              {selectedCustomer.display_name}
            </h1>
            {selectedCustomer.phone && (
              <p className="text-xs text-[#667085] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#087F6E]" />
                <span>{selectedCustomer.phone}</span>
              </p>
            )}
            {selectedCustomer.notes && (
              <p className="text-xs text-[#667085] italic">
                “{selectedCustomer.notes}”
              </p>
            )}

            {/* Customer Aliases (उपनाम) */}
            <div className="pt-2 border-t border-[#E3E5E0]/60">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#667085] flex items-center gap-1 mr-1">
                  <Tag className="w-3 h-3 text-[#E7A23B]" />
                  उपनाम:
                </span>
                {selectedCustomer.aliases && selectedCustomer.aliases.length > 0 ? (
                  selectedCustomer.aliases.map((al) => (
                    <span
                      key={al}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7A23B]/10 text-[#A86408] text-[11px] font-semibold border border-[#E7A23B]/30"
                    >
                      <span>#{al}</span>
                      <button
                        onClick={() => handleRemoveAlias(al)}
                        className="hover:text-red-700 ml-0.5 text-xs font-bold leading-none"
                        title="उपनाम हटाएं"
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-[#667085] italic">कोई उपनाम दर्ज नहीं</span>
                )}

                {isAddingAlias ? (
                  <form onSubmit={handleAddAlias} className="inline-flex items-center gap-1 ml-1">
                    <input
                      type="text"
                      autoFocus
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value)}
                      placeholder="उदा. मास्टर जी"
                      className="px-2 py-0.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#253B73] w-28"
                    />
                    <button
                      type="submit"
                      className="px-2 py-0.5 bg-[#087F6E] text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      जोड़ें
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingAlias(false)}
                      className="px-1.5 py-0.5 text-[#667085] hover:text-black text-xs font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingAlias(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#087F6E] hover:underline ml-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ उपनाम</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right bg-[#F8F7F2] p-4 rounded-2xl border border-[#E3E5E0] w-full sm:w-auto">
            <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
              वर्तमान बकाया हिसाब (Net Balance)
            </span>
            <p
              className={`text-3xl font-black mt-1 ${
                isDebtor ? 'text-[#B42318]' : balPaise < 0 ? 'text-[#16794B]' : 'text-[#667085]'
              }`}
            >
              {formatINR(balPaise)}
            </p>
            <span className="text-xs font-semibold text-[#667085]">
              {isDebtor ? 'उधार बाकी (Customer Owes)' : balPaise < 0 ? 'एडवांस जमा (Advance)' : 'हिसाब चुकता (Nil)'}
            </span>
          </div>
        </div>

        {/* Action Buttons: Add Transaction or Speak */}
        <div className="flex gap-3">
          <button
            onClick={() => setIsQuickTxOpen(true)}
            className="flex-1 py-3 bg-[#253B73] hover:bg-[#1a2b55] text-white font-bold text-sm rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-[#E7A23B]" />
            <span>नया लेन-देन लिखें (Add Entry)</span>
          </button>
          <button
            onClick={onOpenVoice}
            className="px-5 py-3 bg-[#087F6E] hover:bg-[#066154] text-white font-bold text-sm rounded-2xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>बोलकर लिखें</span>
          </button>
        </div>

        {/* Quick Transaction Modal */}
        {isQuickTxOpen && (
          <div className="bg-white p-5 rounded-2xl border border-[#087F6E] shadow-md space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-[#17233B]">
              {selectedCustomer.display_name} के खाते में प्रविष्टि
            </h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setQuickTxType('CREDIT')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  quickTxType === 'CREDIT'
                    ? 'bg-red-50 text-red-800 border-red-300'
                    : 'bg-white text-slate-600 border-[#E3E5E0]'
                }`}
              >
                + उधार (Credit)
              </button>
              <button
                type="button"
                onClick={() => setQuickTxType('PAYMENT')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  quickTxType === 'PAYMENT'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-white text-slate-600 border-[#E3E5E0]'
                }`}
              >
                - जमा / पेमेंट (Payment)
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={quickAmountRupees}
                onChange={(e) => setQuickAmountRupees(e.target.value)}
                placeholder="रकम (₹ Amount in Rupees)"
                className="flex-1 px-4 py-2 text-sm bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
              />
              <button
                onClick={handleAddQuickTx}
                className="px-5 py-2 bg-[#087F6E] hover:bg-[#066154] text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                सेव करें
              </button>
              <button
                onClick={() => setIsQuickTxOpen(false)}
                className="px-3 py-2 bg-slate-100 text-[#667085] rounded-xl text-xs font-semibold cursor-pointer"
              >
                रद्द करें
              </button>
            </div>
          </div>
        )}

        {/* Ledger Transaction History for this customer */}
        <div className="bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#17233B]">
            खाता इतिहास (Ledger Chronology)
          </h2>

          {selectedCustomerTransactions.length === 0 ? (
            <p className="text-xs text-[#667085] text-center py-8">
              इस ग्राहक के लिए अभी कोई लेन-देन दर्ज नहीं है।
            </p>
          ) : (
            <div className="space-y-3">
              {selectedCustomerTransactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT'
                const isReversal = tx.type === 'REVERSAL'

                return (
                  <div
                    key={tx.id}
                    className="p-4 rounded-2xl bg-[#F8F7F2] border border-[#E3E5E0] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
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
                          <span className="text-sm font-bold text-[#17233B]">
                            {tx.type}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-white border border-[#E3E5E0] uppercase text-[#667085]">
                            {tx.source}
                          </span>
                        </div>
                        <p className="text-xs text-[#667085] mt-0.5">
                          {formatFriendlyDate(tx.effective_date, language)}
                          {tx.note && ` • ${tx.note}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span
                          className={`text-lg font-black ${
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
                      </div>

                      {/* Print 80mm Slip */}
                      <button
                        onClick={() => handlePrintSlip(tx)}
                        className="p-2 text-[#667085] hover:text-[#253B73] hover:bg-slate-100 rounded-lg transition"
                        title="पर्ची प्रिंट करें (Print 80mm Slip)"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Reversal action if not already a reversal */}
                      {!isReversal && (
                        <button
                          onClick={() => reverseTransaction(tx.id, 'User requested reversal')}
                          className="p-2 text-[#667085] hover:text-[#B42318] hover:bg-red-50 rounded-lg transition"
                          title="इस प्रविष्टि को वापस (Reverse) करें"
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
      </div>
    )
  }

  // --- 2. Customer List View ---
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#17233B]">
            {t.allCustomers} ({activeCustomers.length})
          </h1>
          <p className="text-xs text-[#667085]">
            ग्राहकों का बही-खाता और बाकी हिसाब
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#087F6E] hover:bg-[#066154] text-white font-bold text-sm shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.addCustomer}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 text-[#667085] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchCustomerPlaceholder}
          className="w-full pl-12 pr-4 py-3 bg-white border border-[#E3E5E0] rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#253B73] shadow-xs"
        />
      </div>

      {/* Customer Grid */}
      {activeCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E3E5E0]">
          <Users className="w-12 h-12 text-[#667085] mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-[#17233B]">{t.noCustomersFound}</h3>
          <p className="text-xs text-[#667085] mt-1">
            ग्राहक का नाम खोजें या ऊपर दिए गए बटन से नया ग्राहक जोड़ें।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCustomers.map((cust) => {
            const bal = customerBalances.get(cust.id)
            const balPaise = bal?.balance_paise || 0
            const isDebtor = balPaise > 0

            return (
              <div
                key={cust.id}
                onClick={() => onSelectCustomer(cust.id)}
                className="bg-white rounded-2xl p-5 border border-[#E3E5E0] hover:border-[#087F6E] hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-[#17233B] group-hover:text-[#087F6E] transition">
                      {cust.display_name}
                    </h3>
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full ${
                        isDebtor
                          ? 'bg-red-50 text-[#B42318]'
                          : balPaise < 0
                          ? 'bg-emerald-50 text-[#16794B]'
                          : 'bg-slate-100 text-[#667085]'
                      }`}
                    >
                      {formatINR(balPaise)}
                    </span>
                  </div>

                  {/* Customer Aliases */}
                  {cust.aliases && cust.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {cust.aliases.map((al) => (
                        <span
                          key={al}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E7A23B]/10 text-[#A86408] border border-[#E7A23B]/20"
                        >
                          #{al}
                        </span>
                      ))}
                    </div>
                  )}

                  {cust.phone && (
                    <p className="text-xs text-[#667085] flex items-center gap-1.5 mt-2">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{cust.phone}</span>
                    </p>
                  )}
                  {cust.notes && (
                    <p className="text-xs text-[#667085] mt-1.5 line-clamp-1">
                      {cust.notes}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-[#E3E5E0]/60 flex items-center justify-between text-xs text-[#667085]">
                  <span>{bal?.transaction_count || 0} लेन-देन</span>
                  <span className="font-semibold text-[#087F6E] group-hover:underline">
                    खाता देखें →
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E3E5E0]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#17233B]">{t.addCustomer}</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#667085] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#17233B] block mb-1">
                  {t.customerName} *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="उदा. Ramesh Sharma"
                  className="w-full px-3.5 py-2.5 bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#253B73]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#17233B] block mb-1">
                  {t.phoneNumber}
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full px-3.5 py-2.5 bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#253B73]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#17233B] block mb-1">
                  पहचान / पता (Notes)
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="उदा. गली नं 4, दर्जी"
                  className="w-full px-3.5 py-2.5 bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#253B73]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#17233B] block mb-1">
                  पहचान / उपनाम (Alias - Optional)
                </label>
                <input
                  type="text"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="उदा. मास्टर जी, शर्मा जी, नुक्कड़ वाले"
                  className="w-full px-3.5 py-2.5 bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#253B73]"
                />
                <p className="text-[10px] text-[#667085] mt-1">
                  आवाज़ से बोलते समय ग्राहक को इस नाम से भी पहचाना जा सकेगा।
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#087F6E] hover:bg-[#066154] text-white font-bold text-sm rounded-xl transition cursor-pointer"
                >
                  ग्राहक जोड़ें
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-3 px-4 bg-slate-100 text-[#667085] font-semibold text-sm rounded-xl transition cursor-pointer"
                >
                  रद्द करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
