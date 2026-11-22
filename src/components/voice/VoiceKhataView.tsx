import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLedger } from '@/contexts/LedgerContext'
import { usePwa } from '@/contexts/PwaContext'
import { VoiceSessionStatus, ParsedVoiceIntent } from '@/types/voice'
import { Customer } from '@/types/ledger'
import { PushToTalkButton } from './PushToTalkButton'
import { AudioWaveform } from './AudioWaveform'
import { speechRegistry } from '@/services/speech/speechRegistry'
import { ActiveProviderType } from '@/services/speech/SpeechProvider'
import { SCRIPTED_DEMO_SCENARIOS, mockSpeechProvider } from '@/services/speech/MockSpeechProvider'
import { webSpeechProvider } from '@/services/speech/WebSpeechProvider'
import { audioRecorder } from '@/services/speech/audioRecorder'
import { parseIntentFromTranscript } from '@/services/parser/intentParser'
import { resolveCustomer, buildDuplicateClarificationPrompt } from '@/services/ledger/customerResolver'
import { sessionMemory } from '@/services/voice/voiceSessionMemory'
import { AnalyticsService } from '@/services/ledger/analyticsService'
import { InventoryService } from '@/services/inventory/inventoryService'
import { VoiceResponseGenerator } from '@/services/voice/voiceResponseGenerator'
import { DailyClosingModal } from '@/components/reports/DailyClosingModal'
import { AnalyticsModal } from '@/components/analytics/AnalyticsModal'
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
  X,
  Radio,
  Clock,
  Mic,
  Settings2,
  UserPlus,
  FileSpreadsheet,
  PieChart,
  Boxes,
  Undo2
} from 'lucide-react'

interface PendingDraft {
  customer: Customer
  type: 'CREDIT' | 'PAYMENT'
  amount_paise: number
  effective_date: string
  source_transcript: string
}

interface NewCustomerPrompt {
  name: string
  amount_paise?: number
  type: 'CREDIT' | 'PAYMENT'
}

interface LatencyBreakdown {
  sttMs: number
  intentMs: number
  ledgerMs: number
  ttsMs: number
  totalMs: number
}

export const VoiceKhataView: React.FC = () => {
  const { t, language } = useLanguage()
  const { shop } = useAuth()
  const {
    customers,
    transactions,
    addTransaction,
    addCustomer,
    customerBalances,
    todayAggregates,
    undoLastTransaction,
    lastRecordedTx,
    inventoryItems,
    isInventoryEnabled,
    updateInventoryStock
  } = useLedger()
  const { isOnline } = usePwa()

  const [providerType, setProviderType] = useState<ActiveProviderType>(speechRegistry.getActiveType())
  const [selectedMockScenarioId, setSelectedMockScenarioId] = useState<string>('scenario-1')
  const [status, setStatus] = useState<VoiceSessionStatus>('idle')
  const [transcript, setTranscript] = useState<string>('')
  const [interimTranscript, setInterimTranscript] = useState<string>('')
  const [parsedIntent, setParsedIntent] = useState<ParsedVoiceIntent | null>(null)
  const [pendingDraft, setPendingDraft] = useState<PendingDraft | null>(null)
  const [duplicateCandidates, setDuplicateCandidates] = useState<Customer[] | null>(null)
  const [newCustomerPrompt, setNewCustomerPrompt] = useState<NewCustomerPrompt | null>(null)
  const [lastSpokenResponse, setLastSpokenResponse] = useState<string>('')
  const [latencyBreakdown, setLatencyBreakdown] = useState<LatencyBreakdown | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [testInput, setTestInput] = useState<string>('')
  const [audioVolume, setAudioVolume] = useState<number>(0)

  // Modals for Advanced Features
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false)
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false)

  // Context Session Memory ticker state
  const [sessionActiveName, setSessionActiveName] = useState<string | null>(null)
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Check active session memory every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (sessionMemory.isValid()) {
        const mem = sessionMemory.getMemory()
        setSessionActiveName(mem?.activeCustomerName || null)
        setSessionTimeLeft(sessionMemory.getRemainingSeconds())
      } else {
        setSessionActiveName(null)
        setSessionTimeLeft(0)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Listen to provider registry changes
  useEffect(() => {
    return speechRegistry.subscribe((type) => {
      setProviderType(type)
    })
  }, [])

  const handleProviderChange = (type: ActiveProviderType) => {
    speechRegistry.setActiveType(type)
    setProviderType(type)
    if (type === 'mock') {
      mockSpeechProvider.setScenario(selectedMockScenarioId)
    } else {
      mockSpeechProvider.clearForcedScenario()
    }
  }

  const handleMockScenarioChange = (scenarioId: string) => {
    setSelectedMockScenarioId(scenarioId)
    mockSpeechProvider.setScenario(scenarioId)
  }

  // Speak response helper using active provider
  const speakResponse = useCallback(
    async (text: string, sttMs: number = 0, intentMs: number = 0, ledgerMs: number = 0) => {
      setLastSpokenResponse(text)
      const provider = speechRegistry.getActiveProvider()
      const ttsStart = performance.now()

      try {
        const synthResult = await provider.synthesize({
          text,
          language
        })
        const ttsMs = Math.round(performance.now() - ttsStart)
        await synthResult.play()

        const totalMs = sttMs + intentMs + ledgerMs + ttsMs
        setLatencyBreakdown({
          sttMs,
          intentMs,
          ledgerMs,
          ttsMs,
          totalMs
        })
      } catch (err) {
        console.warn('Synthesis error:', err)
      }
    },
    [language]
  )

  // Commit transaction to ledger
  const commitTransaction = useCallback(
    async (draft: PendingDraft, sttMs: number = 0, intentMs: number = 0) => {
      setStatus('saving')
      const ledgerStart = performance.now()

      try {
        const res = await addTransaction({
          customer_id: draft.customer.id,
          type: draft.type,
          amount_paise: draft.amount_paise,
          effective_date: draft.effective_date,
          source: 'VOICE',
          transcript_ref: draft.source_transcript,
          note: `${draft.type === 'CREDIT' ? 'उधार' : 'जमा'} (वॉयस खाता)`
        })

        const ledgerMs = Math.round(performance.now() - ledgerStart)

        // Update short-lived context session memory (Feature 1)
        sessionMemory.update({
          activeCustomerId: draft.customer.id,
          activeCustomerName: draft.customer.display_name,
          lastTransactionId: res.transaction.id,
          lastAmountPaise: draft.amount_paise,
          lastIntent: draft.type === 'CREDIT' ? 'ADD_CREDIT' : 'RECORD_PAYMENT'
        })
        setSessionActiveName(draft.customer.display_name)
        setSessionTimeLeft(sessionMemory.getRemainingSeconds())

        // Calculate updated balance
        const updatedBal = customerBalances.get(draft.customer.id)
        const newBalPaise =
          draft.type === 'CREDIT'
            ? (updatedBal?.balance_paise || 0) + draft.amount_paise
            : (updatedBal?.balance_paise || 0) - draft.amount_paise

        const speechText = VoiceResponseGenerator.transactionSuccess(
          draft.type,
          draft.customer.display_name,
          draft.amount_paise,
          newBalPaise,
          language
        )

        setStatus('success')
        setPendingDraft(null)
        setDuplicateCandidates(null)
        setNewCustomerPrompt(null)
        await speakResponse(speechText, sttMs, intentMs, ledgerMs)

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

  // Confirm and create a new customer by voice/tap (Feature 3)
  const handleConfirmNewCustomer = async () => {
    if (!newCustomerPrompt) return
    setStatus('saving')

    try {
      const created = await addCustomer(newCustomerPrompt.name)
      if (newCustomerPrompt.amount_paise && newCustomerPrompt.amount_paise > 0) {
        const draft: PendingDraft = {
          customer: created,
          type: newCustomerPrompt.type,
          amount_paise: newCustomerPrompt.amount_paise,
          effective_date: getTodayDateString(),
          source_transcript: `Naya grahak: ${newCustomerPrompt.name}`
        }
        await commitTransaction(draft, 0, 0)
      } else {
        sessionMemory.update({
          activeCustomerId: created.id,
          activeCustomerName: created.display_name
        })
        const speech = VoiceResponseGenerator.customerCreated(created.display_name, language)
        setStatus('success')
        setNewCustomerPrompt(null)
        await speakResponse(speech, 0, 0, 0)
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err.message || 'Customer creation failed')
    }
  }

  // Process a recognized speech transcript
  const processTranscript = useCallback(
    async (rawText: string, sttMs: number = 0) => {
      setStatus('processing')
      setErrorMessage('')
      setInterimTranscript('')
      setNewCustomerPrompt(null)

      const cleanText = rawText.trim()
      setTranscript(cleanText)

      const intentStart = performance.now()
      setStatus('understanding')

      // 1. Fast deterministic rule-based Kirana parser (< 1ms instant resolution)
      let intent: ParsedVoiceIntent = parseIntentFromTranscript(cleanText, Boolean(pendingDraft))

      // 2. Only consult Gemini API via Gateway if rule parser cannot recognize intent with high confidence
      if (intent.intent === 'CLARIFY' || intent.confidence < 0.75) {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 2000)
          const geminiRes = await fetch('/api/voice/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: cleanText, hasPendingDraft: Boolean(pendingDraft) }),
            signal: controller.signal
          })
          clearTimeout(timer)
          const geminiData = await geminiRes.json()
          if (geminiData && !geminiData.fallbackToRuleParser && geminiData.intent && geminiData.intent !== 'CLARIFY') {
            intent = {
              intent: geminiData.intent,
              customer_name: geminiData.customer_name || null,
              pronoun_used: Boolean(geminiData.pronoun_used),
              amount_paise: geminiData.amount_paise || null,
              transaction_date: getTodayDateString(),
              relative_date_phrase: geminiData.relative_date_phrase || null,
              item_name: geminiData.item_name || null,
              item_quantity: geminiData.item_quantity || null,
              currency: 'INR',
              confidence: geminiData.confidence || 0.95,
              source_transcript: cleanText
            }
          }
        } catch {
          // Keep deterministic intent
        }
      }

      const intentMs = Math.round(performance.now() - intentStart)
      setParsedIntent(intent)

      // =======================================================================
      // ADVANCED FEATURE 1: Context Session Pronoun Resolution ("usne", "inka")
      // =======================================================================
      if (!intent.customer_name || intent.pronoun_used || sessionMemory.detectPronounReference(cleanText)) {
        const contextualMatch = sessionMemory.resolveCustomerFromContext(cleanText)
        if (contextualMatch) {
          intent.customer_name = contextualMatch.customerName
        }
      }

      // =======================================================================
      // ADVANCED FEATURE 7: Voice Undo ("Pichhla hisaab undo karo")
      // =======================================================================
      if (intent.intent === 'UNDO_TRANSACTION') {
        const reversal = await undoLastTransaction()
        if (reversal) {
          const cust = customers.find((c) => c.id === reversal.customer_id)
          const speech = VoiceResponseGenerator.undoSuccess(cust?.display_name || 'Grahak', reversal.amount_paise, language)
          setStatus('success')
          await speakResponse(speech, sttMs, intentMs, 10)
        } else {
          const speech = VoiceResponseGenerator.undoEmpty(language)
          setStatus('error')
          setErrorMessage(speech)
          await speakResponse(speech, sttMs, intentMs, 0)
        }
        return
      }

      // =======================================================================
      // ADVANCED FEATURE 4: Daily Closing Report ("Aaj ka hisaab dikhao")
      // =======================================================================
      if (intent.intent === 'DAILY_CLOSING_REPORT') {
        setIsClosingModalOpen(true)
        const report = AnalyticsService.generateDailyClosingReport(getTodayDateString(), transactions, customers, language)
        setStatus('success')
        await speakResponse(report.spoken_summary, sttMs, intentMs, 5)
        return
      }

      // =======================================================================
      // ADVANCED FEATURE 5: AI Business Analytics ("Sabse zyada udhaar kiska hai")
      // =======================================================================
      if (intent.intent === 'ANALYTICS_QUERY') {
        setIsAnalyticsModalOpen(true)
        const analytics = AnalyticsService.calculateBusinessAnalytics(transactions, customers)
        const speech =
          language === 'en'
            ? `Total market credit is ${formatINR(analytics.total_outstanding_paise)}, and recovery rate is ${analytics.recovery_rate_percentage} percent.`
            : `आपकी दुकान पर कुल ${formatINR(analytics.total_outstanding_paise)} का उधार बाज़ार में है, और वसूली दर ${analytics.recovery_rate_percentage} प्रतिशत है।`
        setStatus('success')
        await speakResponse(speech, sttMs, intentMs, 5)
        return
      }

      // =======================================================================
      // ADVANCED FEATURE 8: Voice Inventory ("Atta ka stock kitna hai")
      // =======================================================================
      if (intent.intent === 'QUERY_INVENTORY') {
        const found = InventoryService.findItemByQuery(intent.item_name || cleanText, inventoryItems)
        if (found) {
          const speech = VoiceResponseGenerator.inventoryStock(found.item_name, found.quantity, found.unit, language)
          setStatus('success')
          await speakResponse(speech, sttMs, intentMs, 5)
        } else {
          const low = InventoryService.getLowStockItems(inventoryItems)
          const speech =
            language === 'en'
              ? `There are ${low.length} items with low stock in your store.`
              : `दुकान में ${low.length} सामान का स्टॉक कम है।`
          setStatus('success')
          await speakResponse(speech, sttMs, intentMs, 5)
        }
        return
      }

      if (intent.intent === 'UPDATE_STOCK') {
        const found = InventoryService.findItemByQuery(cleanText, inventoryItems)
        if (found) {
          const qty = intent.item_quantity || 5
          await updateInventoryStock(found.id, qty)
          const speech = VoiceResponseGenerator.inventoryUpdated(found.item_name, qty, found.quantity + qty, found.unit, language)
          setStatus('success')
          await speakResponse(speech, sttMs, intentMs, 5)
        } else {
          setStatus('error')
          const speech =
            language === 'en'
              ? 'Item not found. Please speak the correct item name.'
              : 'सामान नहीं मिला। कृपया सामान का सही नाम बताएं।'
          setErrorMessage(speech)
          await speakResponse(speech, sttMs, intentMs, 0)
        }
        return
      }

      // =======================================================================
      // Pending draft correction: "Nahi, 430"
      // =======================================================================
      if (intent.intent === 'CORRECT_PENDING_TRANSACTION') {
        if (pendingDraft && intent.amount_paise) {
          const updatedDraft: PendingDraft = {
            ...pendingDraft,
            amount_paise: intent.amount_paise,
            source_transcript: cleanText
          }
          setPendingDraft(updatedDraft)
          setStatus('understanding')

          const speechText = VoiceResponseGenerator.correctionConfirmed(
            updatedDraft.customer.display_name,
            updatedDraft.amount_paise,
            language
          )
          await speakResponse(speechText, sttMs, intentMs, 0)
          return
        }

        // Context-aware correction of last committed transaction
        const mem = sessionMemory.getMemory()
        if (mem?.activeCustomerId && intent.amount_paise) {
          const cust = customers.find((c) => c.id === mem.activeCustomerId)
          if (cust) {
            const draft: PendingDraft = {
              customer: cust,
              type: mem.lastIntent === 'RECORD_PAYMENT' ? 'PAYMENT' : 'CREDIT',
              amount_paise: intent.amount_paise,
              effective_date: getTodayDateString(),
              source_transcript: cleanText
            }
            setPendingDraft(draft)
            setStatus('understanding')
            const speechText = VoiceResponseGenerator.correctionConfirmed(cust.display_name, intent.amount_paise, language)
            await speakResponse(speechText, sttMs, intentMs, 0)
            return
          }
        }
      }

      // =======================================================================
      // Balance Query: "Ramesh ka total kitna hai?"
      // =======================================================================
      if (intent.intent === 'QUERY_CUSTOMER_BALANCE' && intent.customer_name) {
        const match = resolveCustomer(intent.customer_name, customers)
        if (match.type === 'EXACT') {
          sessionMemory.update({
            activeCustomerId: match.customer.id,
            activeCustomerName: match.customer.display_name
          })
          const bal = customerBalances.get(match.customer.id)
          const balPaise = bal?.balance_paise || 0
          const speech = VoiceResponseGenerator.customerBalance(match.customer.display_name, balPaise, language)
          setStatus('success')
          await speakResponse(speech, sttMs, intentMs, 5)
          return
        } else if (match.type === 'AMBIGUOUS') {
          setStatus('clarification_required')
          setDuplicateCandidates(match.candidates)
          const prompt = VoiceResponseGenerator.duplicateClarification(match.candidates, language)
          await speakResponse(prompt, sttMs, intentMs, 5)
          return
        } else {
          setStatus('error')
          const msg = VoiceResponseGenerator.customerNotFound(intent.customer_name, language)
          setErrorMessage(msg)
          await speakResponse(msg, sttMs, intentMs, 0)
          return
        }
      }

      // =======================================================================
      // Daily Credit / Payments
      // =======================================================================
      if (intent.intent === 'QUERY_DAILY_CREDIT') {
        const speech = VoiceResponseGenerator.dailyCredit(todayAggregates.total_credit_paise, language)
        setStatus('success')
        await speakResponse(speech, sttMs, intentMs, 5)
        return
      }

      if (intent.intent === 'QUERY_DAILY_PAYMENTS') {
        const speech = VoiceResponseGenerator.dailyPayment(todayAggregates.total_payment_paise, language)
        setStatus('success')
        await speakResponse(speech, sttMs, intentMs, 5)
        return
      }

      // =======================================================================
      // Explicit Create Customer: "Naya grahak Manoj Kumar jodo"
      // =======================================================================
      if (intent.intent === 'CREATE_CUSTOMER' && intent.customer_name) {
        setNewCustomerPrompt({
          name: intent.customer_name,
          type: 'CREDIT',
          amount_paise: 0
        })
        setStatus('confirm_create_customer')
        const speech =
          language === 'en'
            ? `Do you want to create a new customer account for ${intent.customer_name}?`
            : `क्या ${intent.customer_name} का नया खाता खोलना चाहते हैं?`
        await speakResponse(speech, sttMs, intentMs, 0)
        return
      }

      // =======================================================================
      // Financial Write: CREDIT or PAYMENT
      // =======================================================================
      if ((intent.intent === 'ADD_CREDIT' || intent.intent === 'RECORD_PAYMENT') && intent.amount_paise) {
        if (!intent.customer_name) {
          setStatus('clarification_required')
          const msg = VoiceResponseGenerator.askCustomerName(language)
          setErrorMessage(msg)
          await speakResponse(msg, sttMs, intentMs, 0)
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
          await commitTransaction(draft, sttMs, intentMs)
          return
        }

        if (match.type === 'AMBIGUOUS') {
          setStatus('clarification_required')
          setDuplicateCandidates(match.candidates)
          const prompt = VoiceResponseGenerator.duplicateClarification(match.candidates, language)
          await speakResponse(prompt, sttMs, intentMs, 5)
          return
        }

        // =======================================================================
        // ADVANCED FEATURE 3: Voice Customer Onboarding on Unknown Name
        // =======================================================================
        if (match.type === 'NOT_FOUND') {
          setStatus('confirm_create_customer')
          setNewCustomerPrompt({
            name: intent.customer_name,
            amount_paise: intent.amount_paise,
            type: intent.intent === 'ADD_CREDIT' ? 'CREDIT' : 'PAYMENT'
          })
          const prompt = VoiceResponseGenerator.customerNotFound(intent.customer_name, language)
          await speakResponse(prompt, sttMs, intentMs, 0)
          return
        }
      }

      setStatus('error')
      const fallbackMsg = t.voiceError
      setErrorMessage(fallbackMsg)
      await speakResponse(fallbackMsg, sttMs, intentMs, 0)
    },
    [
      commitTransaction,
      customerBalances,
      customers,
      inventoryItems,
      language,
      pendingDraft,
      speakResponse,
      t.voiceError,
      todayAggregates,
      transactions,
      undoLastTransaction,
      updateInventoryStock
    ]
  )

  // Start Voice Capture
  const handleStartCapture = async () => {
    if (!isOnline && providerType !== 'mock') {
      setStatus('offline')
      return
    }

    setTranscript('')
    setInterimTranscript('')
    setErrorMessage('')
    setDuplicateCandidates(null)
    setNewCustomerPrompt(null)
    setStatus('listening')

    abortControllerRef.current = new AbortController()

    // Gnani Provider records raw microphone audio while button is held
    if (providerType === 'gnani') {
      try {
        await audioRecorder.startRecording((volume) => setAudioVolume(volume))
      } catch (e: any) {
        console.warn('Microphone recording error:', e)
        setStatus('error')
        setErrorMessage(e.message || 'Microphone access failed. Please enable mic permissions.')
      }
      return
    }

    const provider = speechRegistry.getActiveProvider()

    try {
      const result = await provider.streamTranscription({
        language: language === 'en' ? 'en-IN' : 'hi-IN',
        signal: abortControllerRef.current.signal,
        onPartial: (partial) => {
          setInterimTranscript(partial)
        }
      })

      if (result.text) {
        processTranscript(result.text, result.latencyMs)
      } else {
        setStatus('idle')
      }
    } catch (err: any) {
      if (err.message?.includes('aborted')) {
        setStatus('idle')
      } else {
        setStatus('error')
        setErrorMessage(err.message || 'Speech capture failed')
      }
    }
  }

  // End Voice Capture on button release
  const handleStopCapture = async () => {
    if (status !== 'listening') return

    if (providerType === 'gnani') {
      try {
        setStatus('processing')
        const audioBlob = await audioRecorder.stopRecording()
        setAudioVolume(0)

        if (abortControllerRef.current?.signal.aborted) {
          setStatus('idle')
          return
        }

        if (!audioBlob || audioBlob.size < 200) {
          setStatus('idle')
          return
        }

        const provider = speechRegistry.getActiveProvider()
        const result = await provider.streamTranscription({
          audio: audioBlob,
          language: language === 'en' ? 'en-IN' : 'hi-IN',
          signal: abortControllerRef.current?.signal
        })

        if (result.text) {
          processTranscript(result.text, result.latencyMs)
        } else {
          setStatus('idle')
        }
      } catch (err: any) {
        if (err.message?.includes('aborted')) {
          setStatus('idle')
        } else {
          setStatus('error')
          setErrorMessage(err.message || 'Speech recognition failed')
        }
      }
      return
    }

    if (providerType === 'web-speech') {
      const provider = speechRegistry.getActiveProvider()
      if (provider.stop) {
        provider.stop()
      }
    }
  }

  const handleCancelCapture = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    audioRecorder.abortRecording()
    setAudioVolume(0)
    const provider = speechRegistry.getActiveProvider()
    if (provider.stop) {
      provider.stop()
    }
    sessionMemory.clear()
    setSessionActiveName(null)
    setStatus('idle')
    setPendingDraft(null)
    setDuplicateCandidates(null)
    setNewCustomerPrompt(null)
    setErrorMessage('')
    setInterimTranscript('')
  }

  const handleSelectCandidate = (cand: Customer) => {
    if (parsedIntent && parsedIntent.amount_paise) {
      const draft: PendingDraft = {
        customer: cand,
        type: parsedIntent.intent === 'ADD_CREDIT' ? 'CREDIT' : 'PAYMENT',
        amount_paise: parsedIntent.amount_paise,
        effective_date: parsedIntent.transaction_date || getTodayDateString(),
        source_transcript: parsedIntent.source_transcript
      }
      setDuplicateCandidates(null)
      commitTransaction(draft)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Controls: Provider Switcher + Active Features */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#E3E5E0] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#17233B] flex items-center gap-2">
            <span>{t.navVoiceKhata}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#087F6E]/15 text-[#087F6E]">
              Gemini + Gnani
            </span>
          </h1>
          <p className="text-xs text-[#667085]">
            माइक दबाकर बोलें: "रमेश का 340 उधार" या "आज का हिसाब दिखाओ"
          </p>
        </div>

        {/* 3-Way Speech Provider Switcher */}
        <div className="flex items-center gap-1 bg-[#F8F7F2] p-1 rounded-xl border border-[#E3E5E0] text-xs font-semibold self-stretch sm:self-auto">
          <button
            onClick={() => handleProviderChange('mock')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              providerType === 'mock'
                ? 'bg-white text-[#253B73] shadow-xs'
                : 'text-[#667085] hover:text-[#17233B]'
            }`}
          >
            Demo Mock
          </button>
          <button
            onClick={() => handleProviderChange('web-speech')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              providerType === 'web-speech'
                ? 'bg-[#087F6E] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#17233B]'
            }`}
          >
            Live Mic
          </button>
          <button
            onClick={() => handleProviderChange('gnani')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              providerType === 'gnani'
                ? 'bg-[#253B73] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#17233B]'
            }`}
          >
            <span>Gnani AI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#087F6E]"></span>
          </button>
        </div>
      </div>

      {/* Quick Feature Launchers Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setIsClosingModalOpen(true)}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#253B73] text-xs font-bold rounded-xl border border-[#E3E5E0] shadow-xs transition cursor-pointer flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#087F6E]" />
          <span>दैनिक रोकड़ (Daily Closing)</span>
        </button>

        <button
          onClick={() => setIsAnalyticsModalOpen(true)}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#253B73] text-xs font-bold rounded-xl border border-[#E3E5E0] shadow-xs transition cursor-pointer flex items-center gap-1.5"
        >
          <PieChart className="w-3.5 h-3.5 text-[#E7A23B]" />
          <span>व्यापार विश्लेषण (AI Analytics)</span>
        </button>

        {lastRecordedTx && (
          <button
            onClick={undoLastTransaction}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Undo2 className="w-3.5 h-3.5 text-amber-700" />
            <span>पिछला हिसाब Undo करें</span>
          </button>
        )}
      </div>

      {/* Scripted Scenario Picker (Active when Mock Provider is selected) */}
      {providerType === 'mock' && (
        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 shadow-xs space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              डेमो मूल्यांकन परिदृश्य (Judge Scenario):
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
              Repeatable Testing
            </span>
          </div>

          <select
            value={selectedMockScenarioId}
            onChange={(e) => handleMockScenarioChange(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73] cursor-pointer"
          >
            {SCRIPTED_DEMO_SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.description}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hero Push-To-Talk Microphone Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3E5E0] shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Active Session Memory Badge (Feature 1) */}
        {sessionActiveName && (
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#253B73]/10 border border-[#253B73]/20 text-xs font-semibold text-[#253B73] animate-fade-in">
            <span>👤 सक्रिय ग्राहक (Active Session): <strong>{sessionActiveName}</strong></span>
            <span className="text-[10px] bg-[#253B73]/20 px-1.5 py-0.2 rounded-full font-mono">{sessionTimeLeft}s</span>
            <button
              onClick={() => {
                sessionMemory.clear()
                setSessionActiveName(null)
              }}
              className="p-0.5 hover:bg-[#253B73]/20 rounded-full cursor-pointer"
              title="सत्र समाप्त करें"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

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
          {status === 'confirm_create_customer' && (
            <span className="text-xs font-bold text-[#E7A23B] uppercase tracking-wider">
              नया ग्राहक पुष्टि आवश्यक
            </span>
          )}
          {status === 'saving' && (
            <span className="text-xs font-bold text-[#253B73] uppercase tracking-wider">
              {t.voiceSaving}
            </span>
          )}
          {status === 'success' && (
            <span className="text-xs font-bold text-[#16794B] uppercase tracking-wider flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {t.voiceSuccess}
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs font-bold text-[#B42318] uppercase tracking-wider flex items-center justify-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {errorMessage || t.voiceError}
            </span>
          )}
          {status === 'offline' && (
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
              {t.voiceOffline}
            </span>
          )}
        </div>

        {/* Audio Waveform visualization */}
        <div className="h-10 flex items-center justify-center mb-4">
          <AudioWaveform isListening={status === 'listening'} volume={audioVolume} />
        </div>

        {/* Hero Push-To-Talk Button */}
        <div className="relative my-2">
          <PushToTalkButton
            status={status}
            onStartCapture={handleStartCapture}
            onStopCapture={handleStopCapture}
            onCancelCapture={handleCancelCapture}
          />
        </div>

        <p className="text-xs text-[#667085] mt-4 max-w-sm">
          {status === 'listening'
            ? 'बोलना समाप्त करने के लिए बटन छोड़ें'
            : 'माइक दबाकर रखें और अपनी भाषा (हिंदी / Hinglish) में बोलें'}
        </p>

        {status === 'listening' && (
          <button
            onClick={handleCancelCapture}
            className="mt-3 text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>रद्द करें (Cancel)</span>
          </button>
        )}
      </div>

      {/* Live Interim / Final Transcript Card */}
      {(transcript || interimTranscript) && (
        <div className="bg-white rounded-2xl p-5 border border-[#E3E5E0] shadow-xs space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-[#087F6E]" />
              आपकी आवाज़ (Transcript)
            </span>
            {latencyBreakdown && (
              <span className="text-[11px] font-semibold text-[#087F6E]">
                कुल समय: {latencyBreakdown.totalMs}ms
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-[#17233B] leading-relaxed">
            "{transcript || interimTranscript}"
          </p>
        </div>
      )}

      {/* Voice Customer Creation Confirmation Card (Feature 3) */}
      {newCustomerPrompt && (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-300 shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-amber-700" />
              नया ग्राहक जोड़ें (Create New Customer)
            </span>
            <span className="text-xs text-[#667085]">पुष्टि आवश्यक</span>
          </div>

          <p className="text-sm font-semibold text-[#17233B]">
            "<strong>{newCustomerPrompt.name}</strong>" नाम का कोई ग्राहक पहले से दर्ज नहीं है। क्या इनका नया खाता खोलें?
          </p>

          {newCustomerPrompt.amount_paise && newCustomerPrompt.amount_paise > 0 && (
            <div className="text-xs bg-white p-2.5 rounded-xl border border-amber-200 flex justify-between">
              <span>शुरुआती रकम:</span>
              <span className="font-bold text-[#B42318]">
                {formatINR(newCustomerPrompt.amount_paise)} ({newCustomerPrompt.type === 'CREDIT' ? 'उधार' : 'जमा'})
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirmNewCustomer}
              className="flex-1 py-2.5 px-4 bg-[#087F6E] hover:bg-[#066154] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>हाँ, नया खाता खोलें</span>
            </button>
            <button
              onClick={() => {
                setNewCustomerPrompt(null)
                setStatus('idle')
              }}
              className="py-2.5 px-4 bg-white hover:bg-slate-100 text-[#667085] text-xs font-semibold rounded-xl border border-[#E3E5E0] transition cursor-pointer"
            >
              रद्द करें
            </button>
          </div>
        </div>
      )}

      {/* Spoken Response Banner */}
      {lastSpokenResponse && (
        <div className="bg-[#087F6E]/10 rounded-2xl p-4 border border-[#087F6E]/20 flex items-start gap-3 animate-fade-in">
          <Volume2 className="w-5 h-5 text-[#087F6E] shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-[11px] font-bold text-[#087F6E] uppercase tracking-wider block">
              खाताAI उत्तर (Spoken Output)
            </span>
            <p className="text-sm font-semibold text-[#17233B] mt-0.5">
              {lastSpokenResponse}
            </p>
          </div>
        </div>
      )}

      {/* Duplicate Candidates Disambiguation */}
      {duplicateCandidates && duplicateCandidates.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-300 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
            <span>ग्राहक का चयन करें (Select Matching Customer):</span>
          </div>
          <p className="text-xs text-amber-800">
            इस नाम के एक से अधिक ग्राहक हैं। सही ग्राहक पर क्लिक करें:
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
              खाते में लिखने के लिए तैयार (Draft Entry)
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
              onClick={() => commitTransaction(pendingDraft, 0, 0)}
              className="flex-1 py-3 bg-[#087F6E] hover:bg-[#066154] text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>खाते में लिखें (Confirm)</span>
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

      {/* Manual / Scripted Simulation Input */}
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
                processTranscript(testInput, 20)
                setTestInput('')
              }
            }}
            placeholder="उदा. 'Ramesh ka 340 udhaar' या 'Usne 100 diye' या 'Nahi, 430'..."
            className="flex-1 px-3.5 py-2 text-sm bg-[#F8F7F2] border border-[#E3E5E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#253B73]"
          />
          <button
            onClick={() => {
              if (testInput.trim()) {
                processTranscript(testInput, 20)
                setTestInput('')
              }
            }}
            className="px-4 py-2 bg-[#253B73] hover:bg-[#1a2b55] text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Run
          </button>
        </div>
      </div>

      {/* Modals for Advanced Enhancements */}
      <DailyClosingModal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        transactions={transactions}
        customers={customers}
        shop={shop}
      />

      <AnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        transactions={transactions}
        customers={customers}
      />
    </div>
  )
}
