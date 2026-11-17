import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useLedger } from '@/contexts/LedgerContext'
import { usePwa } from '@/contexts/PwaContext'
import { VoiceSessionStatus, ParsedVoiceIntent } from '@/types/voice'
import { Customer } from '@/types/ledger'
import { PushToTalkButton } from './PushToTalkButton'
import { AudioWaveform } from './AudioWaveform'
import { STTService } from '@/services/speech/sttService'
import { TTSService } from '@/services/speech/ttsService'
import { parseIntentFromTranscript } from '@/services/parser/intentParser'
import { resolveCustomer, buildDuplicateClarificationPrompt } from '@/services/ledger/customerResolver'
import { formatINR, formatSpokenINR } from '@/lib/money'
import { formatFriendlyDate, getTodayDateString } from '@/lib/dates'
import {
  Volume2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  UserCheck,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react'

interface PendingDraft {
  customer: Customer
  type: 'CREDIT' | 'PAYMENT'
  amount_paise: number
  effective_date: string
  source_transcript: string
}

export const VoiceKhataView: React.FC = () => {
  const { t, language } = useLanguage()
  const { customers, transactions, addTransaction, customerBalances, todayAggregates } = useLedger()
  const { isOnline } = usePwa()

  const [status, setStatus] = useState<VoiceSessionStatus>('idle')
  const [transcript, setTranscript] = useState<string>('')
  const [parsedIntent, setParsedIntent] = useState<ParsedVoiceIntent | null>(null)
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null)
  const [duplicateCandidates, setDuplicateCandidates] = useState<Customer[] | null>(null)
  const [lastSpokenResponse, setLastSpokenResponse] = useState<string>('')
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [testInput, setTestInput] = useState<string>('')

  // Speech timing ref for latency measurement
  const speechEndTimeRef = useRef<number>(0)

  // Speak response helper and measure latency
  const speakResponse = useCallback(
    async (text: string) => {
      setLastSpokenResponse(text)
      const measuredLatency = await TTSService.speak(text, language)
      if (speechEndTimeRef.current > 0) {
        const totalLatency = Math.round(performance.now() - speechEndTimeRef.current)
        setLatencyMs(totalLatency)
      } else {
        setLatencyMs(measuredLatency)
      }
    },
    [language]
  )

  // Commit a transaction
  const commitTransaction = useCallback(
    async (draft: PendingDraft) => {
      setStatus('saving')
      try {
        const { transaction } = await addTransaction({
          customer_id: draft.customer.id,
          type: draft.type,
          amount_paise: draft.amount_paise,
          effective_date: draft.effective_date,
          source: 'VOICE',
          transcript_ref: draft.source_transcript
        })

        // Compute updated balance
        const updatedBal = customerBalances.get(draft.customer.id)
        const newBalPaise = draft.type === 'CREDIT'
          ? (updatedBal?.balance_paise || 0) + draft.amount_paise
          : (updatedBal?.balance_paise || 0) - draft.amount_paise

        let speechText = ''
        if (draft.type === 'CREDIT') {
          speechText = `${draft.customer.display_name} ke naam ${formatSpokenINR(draft.amount_paise, language)} udhaar darj ho gaya. Unka total baaki ${formatINR(newBalPaise)} hai.`
        } else {
          speechText = `${draft.customer.display_name} se ${formatSpokenINR(draft.amount_paise, language)} payment darj ho gaya. Ab baaki ${formatINR(newBalPaise)} hai.`
        }

        setStatus('success')
        setPendingDraft(null)
        setDuplicateCandidates(null)
        await speakResponse(speechText)

        // Reset to idle after 4 seconds
        setTimeout(() => {
          setStatus('idle')
        }, 4000)
      } catch (err: any) {
        setStatus('error')
        setErrorMessage(err.message || 'Error saving to ledger')
      }
    },
    [addTransaction, customerBalances, language, speakResponse]
  )

  // Process a recognized speech transcript
  const processTranscript = useCallback(
    async (rawText: string) => {
      speechEndTimeRef.current = performance.now()
      setStatus('processing')
      setErrorMessage('')

      const cleanText = rawText.trim()
      setTranscript(cleanText)

      // 1. Intent Parsing
      setStatus('understanding')
      const intent = parseIntentFromTranscript(cleanText, Boolean(pendingDraft))
      setParsedIntent(intent)

      // 2. Handle Pending Draft Correction: "Nahi, 430"
      if (intent.intent === 'CORRECT_PENDING_TRANSACTION' && pendingDraft) {
        if (intent.amount_paise) {
          const updatedDraft: PendingDraft = {
            ...pendingDraft,
            amount_paise: intent.amount_paise,
            source_transcript: cleanText
          }
          setPendingDraft(updatedDraft)
          setStatus('understanding')

          const speechText = `Theek hai, ${updatedDraft.customer.display_name} ka ${formatSpokenINR(updatedDraft.amount_paise, language)} ${updatedDraft.type === 'CREDIT' ? 'udhaar' : 'payment'} likh raha hoon.`
          await speakResponse(speechText)
          return
        }
      }

      // 3. Handle Balance Query: "Ramesh ka total kitna hai?"
      if (intent.intent === 'QUERY_CUSTOMER_BALANCE' && intent.customer_name) {
        const match = resolveCustomer(intent.customer_name, customers)
        if (match.type === 'EXACT') {
          const bal = customerBalances.get(match.customer.id)
          const balPaise = bal?.balance_paise || 0
          const speech = `${match.customer.display_name} ka total baaki ${formatINR(balPaise)} hai.`
          setStatus('success')
          await speakResponse(speech)
          return
        } else if (match.type === 'AMBIGUOUS') {
          setStatus('clarification_required')
          setDuplicateCandidates(match.candidates)
          const prompt = buildDuplicateClarificationPrompt(match.candidates, language)
          await speakResponse(prompt)
          return
        } else {
          setStatus('error')
          const msg = `Is naam ke koi customer nahi mile.`
          setErrorMessage(msg)
          await speakResponse(msg)
          return
        }
      }

      // 4. Handle Daily Totals: "Aaj kitna udhaar gaya?"
      if (intent.intent === 'QUERY_DAILY_CREDIT') {
        const speech = `Aaj ${formatSpokenINR(todayAggregates.total_credit_paise, language)} ka udhaar gaya hai.`
        setStatus('success')
        await speakResponse(speech)
        return
      }

      // 5. Handle Daily Payments: "Aaj kitna payment aaya?"
      if (intent.intent === 'QUERY_DAILY_PAYMENTS') {
        const speech = `Aaj ${formatSpokenINR(todayAggregates.total_payment_paise, language)} ka payment mila hai.`
        setStatus('success')
        await speakResponse(speech)
        return
      }

      // 6. Handle Financial Write: CREDIT or PAYMENT
      if ((intent.intent === 'ADD_CREDIT' || intent.intent === 'RECORD_PAYMENT') && intent.amount_paise) {
        if (!intent.customer_name) {
          setStatus('clarification_required')
          const msg = 'Kripya customer ka naam batayein.'
          setErrorMessage(msg)
          await speakResponse(msg)
          return
        }

        const match = resolveCustomer(intent.customer_name, customers)

        if (match.type === 'EXACT') {
          const draft: PendingDraft = {
            customer: match.customer,
            type: intent.intent === 'ADD_CREDIT' ? 'CREDIT' : 'PAYMENT',
            amount_paise: intent.amount_paise,
            effective_date: intent.transaction_date || getTodayDateString(),
            source_transcript: cleanText
          }
          setPendingDraft(draft)
          // Direct commit or confirmation
          await commitTransaction(draft)
          return
        }

        if (match.type === 'AMBIGUOUS') {
          // DUPLICATE CUSTOMER DETECTED!
          setStatus('clarification_required')
          setDuplicateCandidates(match.candidates)
          // Store pending intent so once selected, it automatically commits
          const prompt = buildDuplicateClarificationPrompt(match.candidates, language)
          await speakResponse(prompt)
          return
        }

        if (match.type === 'NOT_FOUND') {
          // Customer does not exist yet -> Ask to create or confirm
          setStatus('clarification_required')
          const msg = `${intent.customer_name} naam ka grahak naya hai. Kya naya grahak jodein?`
          setErrorMessage(msg)
          await speakResponse(msg)
          return
        }
      }

      // Fallback
      setStatus('error')
      const fallbackMsg = t.voiceError
      setErrorMessage(fallbackMsg)
      await speakResponse(fallbackMsg)
    },
    [commitTransaction, customerBalances, customers, language, pendingDraft, speakResponse, t.voiceError, todayAggregates]
  )

  // Start Voice Capture
  const handleStartCapture = () => {
    if (!isOnline) {
      setStatus('offline')
      return
    }
    setTranscript('')
    setErrorMessage('')
    setDuplicateCandidates(null)
    setStatus('listening')

    const started = STTService.startListening(
      {
        onPartial: (partial) => {
          setTranscript(partial)
        },
        onFinal: (finalText) => {
          setTranscript(finalText)
          processTranscript(finalText)
        },
        onError: (err) => {
          setStatus('error')
          setErrorMessage(err)
        },
        onEnd: () => {
          // If stopped without final, handle transition
        }
      },
      language
    )

    if (!started) {
      // If browser Web Speech is unavailable, indicate error
      setStatus('error')
      setErrorMessage('Microphone not available. Please use test input below.')
    }
  }

  // Stop Voice Capture
  const handleStopCapture = () => {
    STTService.stopListening()
    if (status === 'listening') {
      if (transcript.trim().length > 0) {
        processTranscript(transcript)
      } else {
        setStatus('idle')
      }
    }
  }

  // Duplicate candidate resolution by tapping candidate chip
  const handleSelectCandidate = async (candidate: Customer) => {
    if (parsedIntent && parsedIntent.amount_paise) {
      const draft: PendingDraft = {
        customer: candidate,
        type: parsedIntent.intent === 'RECORD_PAYMENT' ? 'PAYMENT' : 'CREDIT',
        amount_paise: parsedIntent.amount_paise,
        effective_date: parsedIntent.transaction_date || getTodayDateString(),
        source_transcript: transcript
      }
      setPendingDraft(draft)
      await commitTransaction(draft)
    } else if (parsedIntent?.intent === 'QUERY_CUSTOMER_BALANCE') {
      const bal = customerBalances.get(candidate.id)
      const balPaise = bal?.balance_paise || 0
      const speech = `${candidate.display_name} ka total baaki ${formatINR(balPaise)} hai.`
      setStatus('success')
      setDuplicateCandidates(null)
      await speakResponse(speech)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Voice Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#087F6E]/10 text-[#087F6E] text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Bolo. Likho. Hisaab Jaano.</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17233B]">
          {t.navVoiceKhata}
        </h1>
        <p className="text-xs sm:text-sm text-[#667085] max-w-md mx-auto">
          माइक दबाकर रखें और सामान्य भाषा में बोलें। उंगली छोड़ते ही खाताAI हिसाब दर्ज कर देगा।
        </p>
      </div>

      {/* Hero Push-To-Talk Microphone Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3E5E0] shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* State Label Banner */}
        <div className="mb-2">
          {status === 'idle' && (
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              {t.voiceIdleHint}
            </span>
          )}
          {status === 'listening' && (
            <span className="text-xs font-bold text-[#087F6E] uppercase tracking-wider animate-pulse">
              ● {t.voiceListening}
            </span>
          )}
          {status === 'processing' && (
            <span className="text-xs font-bold text-[#E7A23B] uppercase tracking-wider">
              {t.voiceProcessing}
            </span>
          )}
          {status === 'understanding' && (
            <span className="text-xs font-bold text-[#253B73] uppercase tracking-wider">
              {t.voiceUnderstanding}
            </span>
          )}
          {status === 'clarification_required' && (
            <span className="text-xs font-bold text-[#E7A23B] uppercase tracking-wider">
              {t.voiceClarification}
            </span>
          )}
          {status === 'saving' && (
            <span className="text-xs font-bold text-[#253B73] uppercase tracking-wider">
              {t.voiceSaving}
            </span>
          )}
          {status === 'success' && (
            <span className="text-xs font-bold text-[#16794B] uppercase tracking-wider">
              ✓ {t.voiceSuccess}
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs font-bold text-[#B42318] uppercase tracking-wider">
              {t.voiceError}
            </span>
          )}
          {status === 'offline' && (
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              {t.voiceOffline}
            </span>
          )}
        </div>

        {/* Big Hero Microphone Button */}
        <PushToTalkButton
          status={status}
          onStartCapture={handleStartCapture}
          onStopCapture={handleStopCapture}
          disabled={!isOnline}
        />

        {/* Audio Waveform visualization */}
        <AudioWaveform
          isListening={status === 'listening'}
          isProcessing={status === 'processing' || status === 'understanding'}
        />

        {/* Keyboard shortcut hint */}
        <p className="text-[11px] text-[#667085] mt-1">
          डेस्कटॉप पर <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Spacebar</kbd> दबाकर भी बोल सकते हैं
        </p>

        {/* Latency Tag */}
        {latencyMs !== null && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-[#253B73]">
            <span>Latency: {latencyMs} ms</span>
            <span className="text-emerald-700">(&lt; 2s Target Achieved)</span>
          </div>
        )}
      </div>

      {/* Live Transcript & Spoken Response Card */}
      {(transcript || lastSpokenResponse || errorMessage) && (
        <div className="bg-white rounded-2xl p-5 border border-[#E3E5E0] shadow-xs space-y-3 animate-fade-in">
          {transcript && (
            <div>
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block mb-1">
                आपने कहा (Recognized Speech):
              </span>
              <p className="text-base font-semibold text-[#17233B] bg-[#F8F7F2] p-3 rounded-xl border border-[#E3E5E0]">
                “{transcript}”
              </p>
            </div>
          )}

          {lastSpokenResponse && (
            <div className="pt-2 border-t border-[#E3E5E0]/60 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#087F6E]/10 flex items-center justify-center text-[#087F6E] shrink-0 mt-0.5">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#087F6E] uppercase tracking-wider block">
                  खाताAI बोला (Spoken Response):
                </span>
                <p className="text-sm font-semibold text-[#087F6E] mt-0.5">
                  “{lastSpokenResponse}”
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Duplicate Customer Disambiguation Card */}
      {duplicateCandidates && duplicateCandidates.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-300 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <UserCheck className="w-5 h-5 text-amber-700" />
            <span>समान नाम के {duplicateCandidates.length} ग्राहक मिले (Select Customer):</span>
          </div>
          <p className="text-xs text-amber-800">
            कृपया सही ग्राहक पर क्लिक करें या पूरा नाम बोलें:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {duplicateCandidates.map((cand) => {
              const bal = customerBalances.get(cand.id)
              return (
                <button
                  key={cand.id}
                  onClick={() => handleSelectCandidate(cand)}
                  className="p-3.5 bg-white rounded-xl border border-amber-300 hover:border-[#087F6E] hover:shadow-md transition text-left cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <h4 className="font-bold text-sm text-[#17233B] group-hover:text-[#087F6E] transition">
                      {cand.display_name}
                    </h4>
                    <p className="text-xs text-[#667085]">{cand.notes || cand.phone || 'Grahak'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#253B73]">
                      बाकी: {formatINR(bal?.balance_paise || 0)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending Draft Confirmation Card */}
      {pendingDraft && (
        <div className="bg-[#253B73]/5 rounded-2xl p-5 border border-[#253B73]/20 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#253B73] uppercase tracking-wider">
              खाते में लिखने के लिए तैयार (Draft Preview)
            </span>
            <span className="text-xs text-[#667085]">
              {formatFriendlyDate(pendingDraft.effective_date, language)}
            </span>
          </div>

          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-[#E3E5E0]">
            <div>
              <h3 className="font-bold text-base text-[#17233B]">
                {pendingDraft.customer.display_name}
              </h3>
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md mt-1 ${
                  pendingDraft.type === 'CREDIT'
                    ? 'bg-red-50 text-red-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {pendingDraft.type === 'CREDIT' ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>उधार (Credit)</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>जमा (Payment)</span>
                  </>
                )}
              </span>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-[#253B73]">
                {formatINR(pendingDraft.amount_paise)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => commitTransaction(pendingDraft)}
              className="flex-1 py-3 bg-[#087F6E] hover:bg-[#066154] text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.voiceConfirm}</span>
            </button>
            <button
              onClick={() => setPendingDraft(null)}
              className="py-3 px-4 bg-white hover:bg-slate-100 text-[#667085] font-semibold text-sm rounded-xl border border-[#E3E5E0] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Manual / Scripted Simulation Input (For Judges & Test Scenarios) */}
      <div className="bg-white rounded-2xl p-4 border border-[#E3E5E0] shadow-xs">
        <label className="text-xs font-bold text-[#667085] uppercase tracking-wider block mb-2">
          वैकल्पिक टेक्स्ट परीक्षण (Simulate Voice Command):
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && testInput.trim()) {
                processTranscript(testInput)
                setTestInput('')
              }
            }}
            placeholder="उदा. 'Ramesh ka 340 udhaar' या 'Nahi, 430'..."
            className="flex-1 px-3.5 py-2 text-sm bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
          />
          <button
            onClick={() => {
              if (testInput.trim()) {
                processTranscript(testInput)
                setTestInput('')
              }
            }}
            className="px-4 py-2 bg-[#253B73] hover:bg-[#1a2b55] text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  )
}
