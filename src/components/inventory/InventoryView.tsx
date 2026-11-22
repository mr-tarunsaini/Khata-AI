import React, { useState } from 'react'
import { useLedger } from '@/contexts/LedgerContext'
import { formatINR } from '@/lib/money'
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  X,
  Mic,
  Boxes
} from 'lucide-react'

interface InventoryViewProps {
  onOpenVoice?: () => void
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onOpenVoice }) => {
  const { inventoryItems, addInventoryItem, updateInventoryStock } = useLedger()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'low_stock'>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const [newItemName, setNewItemName] = useState('')
  const [newQuantity, setNewQuantity] = useState('10')
  const [newUnit, setNewUnit] = useState('packet')
  const [newPriceRupees, setNewPriceRupees] = useState('50')
  const [newMinStock, setNewMinStock] = useState('5')

  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
    if (filterMode === 'low_stock') {
      return matchesSearch && item.quantity <= item.min_stock_threshold
    }
    return matchesSearch
  })

  const lowStockCount = inventoryItems.filter((i) => i.quantity <= i.min_stock_threshold).length

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    const qty = parseFloat(newQuantity) || 0
    const priceRupees = parseFloat(newPriceRupees) || 0
    const minStock = parseFloat(newMinStock) || 5

    await addInventoryItem(
      newItemName.trim(),
      qty,
      newUnit,
      Math.round(priceRupees * 100),
      minStock
    )

    setNewItemName('')
    setNewQuantity('10')
    setNewPriceRupees('50')
    setIsAddModalOpen(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#17233B]">दुकान इन्वेंट्री (Inventory)</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7A23B]/20 text-[#253B73]">
              वॉयस सक्षम
            </span>
          </div>
          <p className="text-xs text-[#667085]">
            किराना सामान का स्टॉक और रीस्टॉक प्रबंधन • बोलें: "आशीर्वाद आटा का स्टॉक कितना है?"
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenVoice && (
            <button
              onClick={onOpenVoice}
              className="px-3.5 py-2.5 rounded-xl bg-[#087F6E] hover:bg-[#066154] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Mic className="w-4 h-4" />
              <span>बोलकर स्टॉक चेक करें</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#253B73] hover:bg-[#1a2b55] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>नया सामान जोड़ें</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#E3E5E0] shadow-xs">
          <span className="text-[11px] font-bold text-[#667085] uppercase">कुल दर्ज सामान</span>
          <p className="text-2xl font-black text-[#253B73] mt-1">{inventoryItems.length}</p>
        </div>

        <div className={`p-4 rounded-2xl border shadow-xs ${lowStockCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-[#E3E5E0]'}`}>
          <span className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            कम स्टॉक चेतावनी
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">{lowStockCount}</p>
          <span className="text-[10px] text-[#667085]">तुरंत मंगाने की ज़रूरत</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase">वॉयस रीस्टॉक</span>
            <p className="text-xs text-slate-700 mt-0.5">माइक दबाकर बोलें:</p>
            <p className="text-xs font-bold text-[#087F6E]">"5 पैकेट चीनी आया"</p>
          </div>
          <Boxes className="w-8 h-8 text-emerald-600/40" />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E5E0] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="सामान का नाम खोजें (जैसे आटा, चीनी, तेल)..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
          />
        </div>

        <div className="flex gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === 'all' ? 'bg-[#253B73] text-white' : 'bg-slate-100 text-[#667085]'
            }`}
          >
            सभी ({inventoryItems.length})
          </button>
          <button
            onClick={() => setFilterMode('low_stock')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterMode === 'low_stock' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-[#667085]'
            }`}
          >
            कम स्टॉक ({lowStockCount})
          </button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map((item) => {
          const isLowStock = item.quantity <= item.min_stock_threshold

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-white border transition shadow-xs flex flex-col justify-between ${
                isLowStock ? 'border-amber-300 ring-1 ring-amber-200' : 'border-[#E3E5E0]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#17233B]">{item.item_name}</h3>
                  {isLowStock && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      अल्प स्टॉक
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#667085] mt-1">
                  कीमत: <strong>{formatINR(item.price_paise)}</strong> प्रति {item.unit}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E3E5E0]/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#667085] uppercase">मौजूदा स्टॉक</span>
                  <p className="text-lg font-black text-[#253B73]">
                    {item.quantity} <span className="text-xs font-semibold text-[#667085]">{item.unit}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateInventoryStock(item.id, -1)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-sm text-[#17233B] transition cursor-pointer"
                    title="-1 कम करें"
                  >
                    -
                  </button>
                  <button
                    onClick={() => updateInventoryStock(item.id, +1)}
                    className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm transition cursor-pointer"
                    title="+1 जोड़ें"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => updateInventoryStock(item.id, +5)}
                    className="px-2 h-8 rounded-lg bg-[#253B73] hover:bg-[#1a2b55] text-white font-bold text-xs transition cursor-pointer"
                    title="+5 पैकेट रीस्टॉक करें"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E3E5E0] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E5E0]">
              <h2 className="text-base font-bold text-[#17233B]">नया सामान जोड़ें (Add Item)</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 text-[#667085]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#17233B] block mb-1">सामान का नाम *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="उदा. आशीर्वाद आटा 10kg, चीनी 1kg"
                  className="w-full p-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#17233B] block mb-1">स्टॉक मात्रा</label>
                  <input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#17233B] block mb-1">इकाई (Unit)</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl"
                  >
                    <option value="packet">packet (पैकेट)</option>
                    <option value="kg">kg (किलो)</option>
                    <option value="litre">litre (लीटर)</option>
                    <option value="piece">piece (नग)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-[#17233B] block mb-1">कीमत (₹)</label>
                  <input
                    type="number"
                    value={newPriceRupees}
                    onChange={(e) => setNewPriceRupees(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#17233B] block mb-1">न्यूनतम सीमा</label>
                  <input
                    type="number"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="w-full p-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#253B73] hover:bg-[#1a2b55] text-white font-bold text-xs rounded-xl shadow-xs transition mt-2 cursor-pointer"
              >
                इन्वेंट्री में जोड़ें (Save Item)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
