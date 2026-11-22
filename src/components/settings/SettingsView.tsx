import React, { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLedger } from '@/contexts/LedgerContext'
import { usePwa } from '@/contexts/PwaContext'
import { SupportedLanguage } from '@/types/i18n'
import { deriveKeyFromPassphrase, setSessionKey, isSessionUnlocked, lockSession } from '@/lib/crypto'
import {
  Settings,
  Store,
  Globe,
  Lock,
  Download,
  RotateCcw,
  LogOut,
  ShieldCheck,
  Check,
  Key,
  HardDrive,
  Boxes
} from 'lucide-react'

export const SettingsView: React.FC = () => {
  const { language, setLanguage, t } = useLanguage()
  const { shop, user, logout, updateShopName } = useAuth()
  const {
    customers,
    transactions,
    resetDemoData,
    exportLedgerCsv,
    isInventoryEnabled,
    toggleInventoryModule
  } = useLedger()
  const { isOnline } = usePwa()

  const [shopNameInput, setShopNameInput] = useState(shop?.name || '')
  const [isNameSaved, setIsNameSaved] = useState(false)

  // PIN Lock & Web Crypto Session
  const [pinInput, setPinInput] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(isSessionUnlocked())
  const [pinStatusMessage, setPinStatusMessage] = useState('')

  const [isResetDone, setIsResetDone] = useState(false)

  const handleSaveShopName = (e: React.FormEvent) => {
    e.preventDefault()
    if (shopNameInput.trim()) {
      updateShopName(shopNameInput.trim())
      setIsNameSaved(true)
      setTimeout(() => setIsNameSaved(false), 2000)
    }
  }

  const handleUnlockPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinInput.trim()) return
    try {
      const { key } = await deriveKeyFromPassphrase(pinInput)
      setSessionKey(key)
      setIsUnlocked(true)
      setPinStatusMessage('सुरक्षित सेशन अनलॉक हो गया (AES-GCM Key Derived)')
      setPinInput('')
      setTimeout(() => setPinStatusMessage(''), 3000)
    } catch (err: any) {
      setPinStatusMessage('त्रुटि: PIN अनलॉक नहीं हो सका')
    }
  }

  const handleLockPin = () => {
    lockSession()
    setIsUnlocked(false)
    setPinStatusMessage('सेशन लॉक कर दिया गया')
    setTimeout(() => setPinStatusMessage(''), 2000)
  }

  const handleResetData = async () => {
    if (window.confirm('क्या आप वाकई सभी डेमो डेटा रीसेट करना चाहते हैं?')) {
      await resetDemoData()
      setIsResetDone(true)
      setTimeout(() => setIsResetDone(false), 2500)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#17233B]">{t.navSettings}</h1>
        <p className="text-xs text-[#667085]">
          दुकान प्रोफ़ाइल, भाषा, सुरक्षा और डेटा प्रबंधन
        </p>
      </div>

      {/* 1. Language Preferences */}
      <div className="bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#E3E5E0]">
          <Globe className="w-5 h-5 text-[#087F6E]" />
          <h2 className="text-base font-bold text-[#17233B]">भाषा चयन (Language Preference)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { code: 'hi', label: 'हिंदी (Hindi)', desc: 'बोली और पुष्टि पूर्ण हिंदी में' },
            { code: 'hi-en', label: 'Hinglish', desc: 'दुकानदार की स्वाभाविक बोलचाल' },
            { code: 'en', label: 'English', desc: 'Standard Indian English' }
          ].map((item) => (
            <button
              key={item.code}
              onClick={() => setLanguage(item.code as SupportedLanguage)}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                language === item.code
                  ? 'border-[#253B73] bg-[#253B73]/5 ring-2 ring-[#253B73]'
                  : 'border-[#E3E5E0] bg-white hover:bg-slate-50'
              }`}
            >
              <span className="font-bold text-sm text-[#17233B] block">{item.label}</span>
              <span className="text-[11px] text-[#667085] mt-1 block">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Shop Profile */}
      <div className="bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#E3E5E0]">
          <Store className="w-5 h-5 text-[#253B73]" />
          <h2 className="text-base font-bold text-[#17233B]">दुकान प्रोफ़ाइल (Shop Profile)</h2>
        </div>

        <form onSubmit={handleSaveShopName} className="space-y-4 max-w-lg">
          <div>
            <label className="text-xs font-bold text-[#17233B] block mb-1">
              दुकान का नाम (Shop Name)
            </label>
            <input
              type="text"
              value={shopNameInput}
              onChange={(e) => setShopNameInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#253B73]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#667085] block">मालिक का नाम:</span>
              <span className="font-bold text-[#17233B]">{user?.full_name || 'Rajesh Sharma'}</span>
            </div>
            <div>
              <span className="text-[#667085] block">टाइमज़ोन (Timezone):</span>
              <span className="font-bold text-[#17233B]">{shop?.timezone || 'Asia/Kolkata'}</span>
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#253B73] hover:bg-[#1a2b55] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
          >
            {isNameSaved ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>नाम अपडेट हो गया!</span>
              </>
            ) : (
              <span>अपडेट करें</span>
            )}
          </button>
        </form>
      </div>

      {/* 3. Security & Local Encryption (Web Crypto API) */}
      <div className="bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#E3E5E0]">
          <ShieldCheck className="w-5 h-5 text-[#087F6E]" />
          <h2 className="text-base font-bold text-[#17233B]">
            स्थानीय सुरक्षा व एन्क्रिप्शन (Web Crypto AES-GCM)
          </h2>
        </div>

        <p className="text-xs text-[#667085] leading-relaxed">
          आपका कैश डेटा ब्राउज़र के Web Crypto API से सुरक्षित रहता है। आप 4-अंकों का PIN दर्ज करके सेशन को अनलॉक या लॉक कर सकते हैं। कोई भी पासवर्ड या रॉ-की स्टोरेज में सुरक्षित नहीं रखी जाती।
        </p>

        {isUnlocked ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-emerald-700" />
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  एन्क्रिप्शन सेशन सक्रिय है (Unlocked)
                </span>
                <span className="text-[11px] text-emerald-700">
                  AES-256-GCM कुंजी मेमोरी में सुरक्षित है।
                </span>
              </div>
            </div>
            <button
              onClick={handleLockPin}
              className="px-4 py-2 bg-white text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
            >
              सेशन लॉक करें
            </button>
          </div>
        ) : (
          <form onSubmit={handleUnlockPin} className="flex gap-2 max-w-sm">
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="4-अंकीय PIN दर्ज करें"
              className="flex-1 px-4 py-2 text-sm bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#087F6E] hover:bg-[#066154] text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              अनलॉक करें
            </button>
          </form>
        )}

        {pinStatusMessage && (
          <p className="text-xs font-semibold text-[#087F6E] mt-1">{pinStatusMessage}</p>
        )}
      </div>

      {/* 4. Modular Voice Inventory Module Toggle */}
      <div className="bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E3E5E0]">
          <div className="flex items-center gap-2.5">
            <Boxes className="w-5 h-5 text-[#253B73]" />
            <div>
              <h2 className="text-base font-bold text-[#17233B]">
                मॉड्यूलर किराना इन्वेंट्री (Voice Inventory Module)
              </h2>
              <p className="text-xs text-[#667085]">
                किराना दुकान के प्रमुख सामान का स्टॉक बोलकर चेक व अपडेट करें
              </p>
            </div>
          </div>

          <button
            onClick={() => toggleInventoryModule(!isInventoryEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              isInventoryEnabled ? 'bg-[#087F6E]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isInventoryEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="text-xs text-[#667085] leading-relaxed">
          {isInventoryEnabled ? (
            <p className="text-[#087F6E] font-medium">
              ✅ इन्वेंट्री मॉड्यूल सक्रिय है। साइडबार में "इन्वेंट्री" टैब उपलब्ध है। आप बोल सकते हैं: <em>"चावल कितना बचा है?"</em> या <em>"20 किलो चीनी आई।"</em>
            </p>
          ) : (
            <p>
              इन्वेंट्री मॉड्यूल बंद है। यदि आपकी किराना दुकान में स्टॉक ट्रैकिंग की आवश्यकता हो, तो इसे सक्षम करें।
            </p>
          )}
        </div>
      </div>

      {/* 5. Cache & Data Controls */}
      <div className="bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#E3E5E0]">
          <HardDrive className="w-5 h-5 text-[#253B73]" />
          <h2 className="text-base font-bold text-[#17233B]">लोकल स्टोरेज व डेटा प्रबंधन</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs bg-[#F8F7F2] p-4 rounded-2xl border border-[#E3E5E0]">
          <div>
            <span className="text-[#667085] block">सक्रिय ग्राहक:</span>
            <span className="text-sm font-bold text-[#17233B]">
              {customers.filter((c) => !c.archived_at).length} ग्राहक
            </span>
          </div>
          <div>
            <span className="text-[#667085] block">कुल लेन-देन:</span>
            <span className="text-sm font-bold text-[#17233B]">
              {transactions.length} रिकॉर्ड
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={exportLedgerCsv}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#E3E5E0] hover:bg-slate-50 text-xs font-bold text-[#253B73] transition cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#087F6E]" />
            <span>CSV निर्यात करें (Download Ledger CSV)</span>
          </button>

          <button
            onClick={handleResetData}
            className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-xs font-bold text-[#B42318] transition cursor-pointer flex items-center gap-2"
          >
            {isResetDone ? (
              <>
                <Check className="w-4 h-4" />
                <span>डेमो डेटा रीसेट हो गया!</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>डेमो डेटा रीसेट करें (Reset Synthetic Data)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 5. Logout */}
      <div className="bg-white rounded-3xl p-6 border border-[#E3E5E0] shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#17233B]">दुकान सत्र समाप्त करें</h3>
          <p className="text-xs text-[#667085]">सुरक्षित रूप से लॉगआउट करें या दुकान बदलें।</p>
        </div>
        <button
          onClick={logout}
          className="px-5 py-2.5 bg-[#B42318] hover:bg-red-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.navLogout}</span>
        </button>
      </div>
    </div>
  )
}
