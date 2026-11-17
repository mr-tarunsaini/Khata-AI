import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Mic,
  ShieldCheck,
  Zap,
  Users,
  Volume2,
  CheckCircle,
  Sparkles,
  ArrowRight,
  Store,
  Smartphone,
  Lock,
  Receipt
} from 'lucide-react'

interface LandingPageProps {
  onGetStarted: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { t } = useLanguage()

  const steps = [
    {
      step: '01',
      title: 'माइक दबाकर बोलें (Press & Speak)',
      description: 'दुकान की व्यस्तता में बिना टाइप किये बोलें: "रमेश का 340 उधार" या "सुरेश ने 200 दिए।"',
      icon: Mic
    },
    {
      step: '02',
      title: 'सटीक AI समझ (Accurate Intent)',
      description: 'खाताAI ग्राहक का नाम, सही रकम और तारीख समझकर खाते में सुरक्षित एंट्री तैयार करता है।',
      icon: Zap
    },
    {
      step: '03',
      title: 'आवाज़ में पक्का हिसाब (Spoken Confirmation)',
      description: 'तुरंत आवाज़ में सुनें: "रमेश के नाम ₹340 उधार दर्ज हो गया। कुल बाकी ₹540 है।"',
      icon: Volume2
    }
  ]

  const features = [
    {
      icon: ShieldCheck,
      title: '100% सटीक वित्तीय नियम (Deterministic Ledger)',
      desc: 'पैसे की गिनती में कभी कोई AI भ्रम नहीं। सभी हिसाब सर्वर पर प्रमाणित गणितीय नियमों से दर्ज होते हैं।'
    },
    {
      icon: Volume2,
      title: 'हिंदी और हिंग्लिश आवाज़ (Indic Voice First)',
      desc: 'किराना दुकानदारों की आम बोलचाल — "तीन सौ चालीस", "पाँच सौ", "कल का उधार" सब समझता है।'
    },
    {
      icon: Users,
      title: 'समान नाम स्पष्टीकरण (Duplicate Disambiguation)',
      desc: 'अगर दो रमेश हैं, तो तुरंत पूछता है: "रमेश शर्मा या रमेश गुप्ता?" बिना पक्के जवाब के एंट्री नहीं होती।'
    },
    {
      icon: Smartphone,
      title: 'इंस्टॉल होने वाला PWA (App-like PWA)',
      desc: 'मोबाइल, टैबलेट और कंप्यूटर पर बिना किसी अलग ऐप के तुरंत काम करता है और होम स्क्रीन पर इंस्टॉल होता है।'
    },
    {
      icon: Lock,
      title: 'एन्क्रिप्टेड सुरक्षित स्टोरेज (Web Crypto AES-GCM)',
      desc: 'स्थानीय डेटा Web Crypto API से सुरक्षित रूप से एन्क्रिप्ट रहता है। दुकान का डेटा केवल दुकान का है।'
    },
    {
      icon: Receipt,
      title: 'अपरिवर्तनीय लेन-देन (Append-Only Audit Trail)',
      desc: 'पुरानी प्रविष्टियों में कभी चुपचाप बदलाव नहीं होता। सुधार के लिए पारदर्शी रिवर्सल एंट्री बनती है।'
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8F7F2] text-[#17233B]">
      {/* Top Banner */}
      <div className="bg-[#253B73] text-white py-2 px-4 text-center text-xs font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#E7A23B]" />
        <span>BOL Bharat Hackathon PS2 – Voice Khata for Kirana Stores</span>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7A23B]/15 text-[#253B73] text-xs font-bold mb-6">
          <Store className="w-4 h-4 text-[#087F6E]" />
          <span>{t.tagline}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#17233B] tracking-tight leading-tight max-w-4xl mx-auto">
          Your Khata Book, <br />
          <span className="text-[#253B73]">Now Speaks Your Language.</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-[#667085] max-w-2xl mx-auto">
          अब व्यस्त काउंटर पर ग्राहक संभालते हुए कागज़-कलम या टाइपिंग की ज़रूरत नहीं। माइक दबाइए, बोलिए, और पक्का हिसाब रखिए।
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4 bg-[#253B73] hover:bg-[#1a2b55] text-white text-base font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-3 cursor-pointer group"
          >
            <span>शुरू करें (Launch Digital Khata)</span>
            <ArrowRight className="w-5 h-5 text-[#E7A23B] group-hover:translate-x-1 transition" />
          </button>

          <div className="flex items-center gap-2 text-xs text-[#087F6E] font-semibold bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            <span>लाइव डेमो उपलब्ध • बिना पासवर्ड आज़माएं</span>
          </div>
        </div>

        {/* Interactive Voice Demo Preview Card */}
        <div className="mt-12 max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#E3E5E0] text-left">
          <div className="flex items-center justify-between pb-4 border-b border-[#E3E5E0]">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-[#667085] ml-2">वॉइस इंटरैक्शन डेमो</span>
            </div>
            <span className="text-xs font-bold text-[#087F6E] bg-emerald-50 px-2.5 py-1 rounded-full">
              Real-Time
            </span>
          </div>

          <div className="space-y-4 my-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#253B73] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                दुकानदार
              </div>
              <div className="bg-[#F8F7F2] p-3.5 rounded-2xl rounded-tl-none border border-[#E3E5E0] text-sm font-semibold text-[#17233B]">
                “रमेश का 340 उधार लिखो।”
              </div>
            </div>

            <div className="flex items-start gap-3 flex-row-reverse">
              <div className="w-8 h-8 rounded-full bg-[#087F6E] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                खाताAI
              </div>
              <div className="bg-[#087F6E]/10 p-3.5 rounded-2xl rounded-tr-none border border-[#087F6E]/20 text-sm font-semibold text-[#087F6E]">
                “रमेश शर्मा के नाम ₹340 उधार दर्ज हो गया। उनका कुल बाकी ₹540 है।”
              </div>
            </div>
          </div>

          <div className="bg-[#F8F7F2] p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#087F6E] flex items-center justify-center text-white">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#17233B]">त्वरित वॉइस उत्तर (Target: &lt; 2s)</p>
                <p className="text-[11px] text-[#667085]">Gnani Prisma STT + Timbre TTS आर्किटेक्चर</p>
              </div>
            </div>
            <button
              onClick={onGetStarted}
              className="text-xs font-bold text-[#253B73] hover:underline cursor-pointer"
            >
              आवाज़ आज़माएं →
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-16 border-y border-[#E3E5E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-[#17233B]">यह कैसे काम करता है? (How It Works)</h2>
            <p className="mt-2 text-sm text-[#667085]">
              दुकानदार की सुविधा के लिए तीन आसान चरण
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, idx) => {
              const Icon = s.icon
              return (
                <div
                  key={idx}
                  className="bg-[#F8F7F2] rounded-3xl p-6 border border-[#E3E5E0] hover:shadow-md transition relative"
                >
                  <span className="text-3xl font-extrabold text-[#253B73]/20 mb-2 block">
                    {s.step}
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-[#253B73] text-white flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-[#E7A23B]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#17233B] mb-2">{s.title}</h3>
                  <p className="text-xs text-[#667085] leading-relaxed">{s.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-[#17233B]">किराना दुकान के लिए खास खूबियां</h2>
          <p className="mt-2 text-sm text-[#667085]">
            विश्वास, सुरक्षा और वित्तीय शुद्धता के साथ निर्मित
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-[#E3E5E0] shadow-xs hover:border-[#087F6E] transition"
              >
                <div className="w-10 h-10 rounded-xl bg-[#087F6E]/10 flex items-center justify-center text-[#087F6E] mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#17233B] mb-2">{f.title}</h3>
                <p className="text-xs text-[#667085] leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Privacy and Security Section */}
      <section className="bg-[#253B73] text-white py-14">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-[#E7A23B]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold">100% सुरक्षित और जिम्मेदार AI</h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-200 max-w-2xl mx-auto leading-relaxed">
            BOL Bharat Hackathon के सभी नैतिक और सुरक्षा दिशा-निर्देशों का अनुपालन। कोई वसूली दबाव या अनैतिक रिमाइंडर्स नहीं। बिना सहमति के किसी का व्यक्तिगत डेटा नहीं लिया जाता।
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#087F6E]" />
              रो लेवल सिक्योरिटी (Supabase RLS)
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#087F6E]" />
              स्थानीय एन्क्रिप्टेड IndexedDB
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#087F6E]" />
              कोई वॉइस क्लोनिंग नहीं
            </span>
          </div>

          <div className="mt-8">
            <button
              onClick={onGetStarted}
              className="px-6 py-3 bg-[#E7A23B] hover:bg-[#d4912c] text-[#17233B] font-bold rounded-xl shadow-md transition cursor-pointer text-sm"
            >
              खाताAI खोलें (Launch App)
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E3E5E0] py-8 text-center text-xs text-[#667085]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#253B73]">खाताAI (KhataAI)</span>
            <span>• Bolo. Likho. Hisaab Jaano.</span>
          </div>
          <p>© 2026 KhataAI. BOL Bharat Hackathon PS2.</p>
        </div>
      </footer>
    </div>
  )
}
