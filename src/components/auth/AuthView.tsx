import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Store, Lock, Mail, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

interface AuthViewProps {
  onSuccess: () => void
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { login, signup, isDemoMode, isLoading } = useAuth()
  const { t } = useLanguage()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('sharma.kirana@demo.in')
  const [password, setPassword] = useState('KhataAI2026!')
  const [shopName, setShopName] = useState('Sharma Kirana Store')
  const [ownerName, setOwnerName] = useState('Rajesh Sharma')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'signup') {
        await signup(shopName, ownerName, email, password)
      } else {
        await login(email, password)
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Authentication error')
    }
  }

  const handleQuickDemoAccess = async () => {
    await login('sharma.kirana@demo.in')
    onSuccess()
  }

  return (
    <div className="min-h-screen bg-[#F8F7F2] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#E3E5E0] shadow-xl space-y-6">
        {/* Top Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#253B73] text-white flex items-center justify-center mx-auto text-2xl font-black shadow-md">
            खा
          </div>
          <h1 className="text-2xl font-extrabold text-[#17233B]">खाताAI (KhataAI)</h1>
          <p className="text-xs text-[#667085]">{t.tagline}</p>
        </div>

        {/* 1-Click Fast Judge Demo Access */}
        <div className="bg-[#087F6E]/10 p-4 rounded-2xl border border-[#087F6E]/20 text-center space-y-2">
          <span className="text-xs font-bold text-[#087F6E] flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            त्वरित डेमो ऐक्सेस (Instant Demo Mode)
          </span>
          <p className="text-[11px] text-[#667085]">
            बिना किसी साइन अप के सीधे टेस्ट डेटा के साथ शुरू करें
          </p>
          <button
            onClick={handleQuickDemoAccess}
            className="w-full py-2.5 px-4 bg-[#087F6E] hover:bg-[#066154] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#E7A23B]" />
            <span>सीधे प्रवेश करें (Launch Demo Shop)</span>
          </button>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#E3E5E0]" />
          <span className="shrink-0 mx-3 text-xs text-[#667085]">या खाते में प्रवेश करें</span>
          <div className="flex-grow border-t border-[#E3E5E0]" />
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-[#F8F7F2] p-1 border border-[#E3E5E0]">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              mode === 'login' ? 'bg-white text-[#253B73] shadow-xs' : 'text-[#667085]'
            }`}
          >
            {t.navLogin}
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              mode === 'signup' ? 'bg-white text-[#253B73] shadow-xs' : 'text-[#667085]'
            }`}
          >
            {t.navSignUp}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <>
              <div>
                <label className="text-xs font-bold text-[#17233B] block mb-1">
                  दुकान का नाम (Shop Name) *
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="उदा. Sharma Kirana Store"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#17233B] block mb-1">
                  मालिक का नाम (Owner Name) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="उदा. Rajesh Sharma"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-[#17233B] block mb-1">
              ईमेल (Email) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sharma@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#17233B] block mb-1">
              पासवर्ड (Password) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#253B73] hover:bg-[#1a2b55] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <span>{mode === 'login' ? 'लॉग इन करें' : 'नया खाता बनाएं'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
