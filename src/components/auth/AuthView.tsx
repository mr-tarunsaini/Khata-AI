import React, { useState } from 'react'
import { useAuth, DUMMY_ACCOUNT } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Store, Lock, Mail, User, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react'

interface AuthViewProps {
  onSuccess: () => void
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { login, signup, isLoading } = useAuth()
  const { t } = useLanguage()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [shopName, setShopName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (mode === 'signup') {
        if (!shopName.trim() || !ownerName.trim()) {
          throw new Error('कृपया दुकान और मालिक का नाम भरें (Shop and owner name are required)')
        }
        await signup(shopName, ownerName, email, password)
      } else {
        await login(email, password)
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'प्रमाणीकरण त्रुटि (Authentication error)')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Pre-fill demo test credentials into form inputs
  const handleFillDemoCredentials = () => {
    setMode('login')
    setEmail(DUMMY_ACCOUNT.email)
    setPassword(DUMMY_ACCOUNT.password)
    setError('')
  }

  // One-click direct demo login
  const handleQuickDemoLogin = async () => {
    setError('')
    setIsSubmitting(true)
    try {
      await login(DUMMY_ACCOUNT.email, DUMMY_ACCOUNT.password)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'डेमो लॉगिन में त्रुटि')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F2] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#E3E5E0] shadow-xl space-y-5">
        {/* Top Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#253B73] text-white flex items-center justify-center mx-auto text-2xl font-black shadow-md">
            K
          </div>
          <h1 className="text-2xl font-extrabold text-[#17233B]">खाताAI (KhataAI)</h1>
          <p className="text-xs text-[#667085]">{t.tagline}</p>
        </div>

        {/* Ready-to-Use Dummy Account Card */}
        <div className="bg-[#087F6E]/10 p-4 rounded-2xl border border-[#087F6E]/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#087F6E] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              रेडीमेड टेस्ट खाता (Pre-Loaded Test Account)
            </span>
            <span className="text-[10px] bg-[#087F6E]/20 text-[#087F6E] px-2 py-0.5 rounded-full font-semibold">
              5 ग्राहक + 8 लेन-देन
            </span>
          </div>
          <p className="text-[11px] text-[#667085]">
            शर्मा किराना स्टोर का रेडीमेड खाता जिसमें पहले से ग्राहक और उधारी का हिसाब दर्ज है:
          </p>
          <div className="bg-white/80 p-2.5 rounded-xl border border-[#087F6E]/20 text-[11px] text-[#17233B] font-mono space-y-0.5">
            <div className="flex justify-between">
              <span className="text-[#667085]">ईमेल:</span>
              <span className="font-semibold">{DUMMY_ACCOUNT.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">पासवर्ड:</span>
              <span className="font-semibold">{DUMMY_ACCOUNT.password}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleFillDemoCredentials}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-[#087F6E] border border-[#087F6E]/30 font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>फॉर्म में भरें (Auto-Fill)</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting || isLoading}
              onClick={handleQuickDemoLogin}
              className="flex-1 py-2 px-3 bg-[#087F6E] hover:bg-[#066154] text-white font-bold text-[11px] rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#E7A23B]" />
              <span>सीधे प्रवेश करें (1-Click Login)</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#E3E5E0]" />
          <span className="shrink-0 mx-3 text-xs text-[#667085]">या अपने खाते से लॉगिन करें</span>
          <div className="flex-grow border-t border-[#E3E5E0]" />
        </div>

        {/* Tab switch: Login vs Sign Up */}
        <div className="flex rounded-xl bg-[#F8F7F2] p-1 border border-[#E3E5E0]">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              mode === 'login' ? 'bg-white text-[#253B73] shadow-xs' : 'text-[#667085]'
            }`}
          >
            {t.navLogin} (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError('')
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              mode === 'signup' ? 'bg-white text-[#253B73] shadow-xs' : 'text-[#667085]'
            }`}
          >
            {t.navSignUp} (Sign Up)
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-start gap-2">
            <span className="shrink-0 font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
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
                  दुकानदार / मालिक का नाम (Owner Name) *
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
              ईमेल पता (Email Address) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sharma.kirana@demo.in या your-email@gmail.com"
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
                placeholder="कम से कम 6 अक्षर"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full py-3 bg-[#253B73] hover:bg-[#1a2b55] disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>कृपया प्रतीक्षा करें (Processing)...</span>
              </span>
            ) : (
              <>
                <span>{mode === 'login' ? 'लॉग इन करें (Sign In)' : 'नया खाता बनाएं (Create Account)'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-1">
          <p className="text-[11px] text-[#667085] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#087F6E]" />
            <span>सुरक्षित Supabase प्रमाणीकरण एवं 256-बिट AES एन्क्रिप्शन</span>
          </p>
        </div>
      </div>
    </div>
  )
}
