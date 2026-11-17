import { z } from 'zod'
import { ParsedVoiceIntent, VoiceIntentType } from '@/types/voice'
import { parseSpokenAmountPaise } from '@/lib/numberParser'
import { parseRelativeDatePhrase, getTodayDateString } from '@/lib/dates'
import { normalizeCustomerName } from '@/services/ledger/customerResolver'

// Zod Schema for strict server/client validation of parsed intents
export const ParsedVoiceIntentSchema = z.object({
  intent: z.enum([
    'ADD_CREDIT',
    'RECORD_PAYMENT',
    'QUERY_CUSTOMER_BALANCE',
    'QUERY_DAILY_CREDIT',
    'QUERY_DAILY_PAYMENTS',
    'CORRECT_PENDING_TRANSACTION',
    'CLARIFY'
  ]),
  customer_name: z.string().nullable(),
  amount_paise: z.number().int().positive().nullable(),
  transaction_date: z.string().nullable(),
  relative_date_phrase: z.string().nullable(),
  currency: z.literal('INR'),
  confidence: z.number().min(0).max(1),
  source_transcript: z.string(),
  correction_target: z.string().nullable().optional(),
  clarification_reason: z.string().nullable().optional()
})

// Keywords indicating CREDIT (Udhaar)
const CREDIT_KEYWORDS = [
  'udhaar', 'udhar', 'likho', 'likh do', 'likh lo', 'baaki', 'baki', 'khate me', 'credit', 'diya', 'diye', 'de diya', 'samaan diya'
]

// Keywords indicating PAYMENT (Jama / Payment / Diya / Mila)
const PAYMENT_KEYWORDS = [
  'jama', 'payment', 'pay kiya', 'paise diye', 'diye', 'de gaya', 'chuka diya', 'mila', 'aaya', 'wasool', 'vasooli'
]

// Keywords indicating BALANCE QUERY
const QUERY_BALANCE_KEYWORDS = [
  'total', 'hisaab', 'hisab', 'balance', 'kitna hai', 'kitna baaki', 'kitna baki', 'kya hai'
]

// Keywords indicating DAILY CREDIT QUERY
const QUERY_DAILY_CREDIT_KEYWORDS = [
  'aaj kitna udhaar', 'aaj ka udhaar', 'aaj kitna udhar', 'aaj ka total udhaar'
]

// Keywords indicating DAILY PAYMENT QUERY
const QUERY_DAILY_PAYMENT_KEYWORDS = [
  'aaj kitna payment', 'aaj kitne paise aaye', 'aaj kitni wasooli', 'aaj ka payment', 'kal ke payment'
]

// Keywords indicating CORRECTION
const CORRECTION_KEYWORDS = [
  'nahi', 'nahi nahi', 'galat', 'correction', 'badlo', 'change', 'sorry', 'no'
]

/**
 * Deterministic Intent Parser for Speech Transcripts.
 * 
 * Accurately handles Hindi, Hinglish, and English kirana voice commands.
 */
export function parseIntentFromTranscript(
  transcript: string,
  hasPendingDraft: boolean = false
): ParsedVoiceIntent {
  const clean = transcript.trim()
  const lower = clean.toLowerCase()

  // 1. Check for immediate correction: "Nahi, 430", "Galat, 430", "Correction 430"
  const startsWithCorrection = CORRECTION_KEYWORDS.some((kw) => lower.startsWith(kw) || lower.includes(`${kw},`) || lower.includes(`${kw} `))
  if (startsWithCorrection || (hasPendingDraft && /^\d+$/.test(lower.trim()))) {
    const correctedAmount = parseSpokenAmountPaise(clean)
    if (correctedAmount) {
      return {
        intent: 'CORRECT_PENDING_TRANSACTION',
        customer_name: null,
        amount_paise: correctedAmount,
        transaction_date: getTodayDateString(),
        relative_date_phrase: null,
        currency: 'INR',
        confidence: 0.98,
        source_transcript: clean,
        correction_target: 'PENDING_TRANSACTION'
      }
    }
  }

  // 2. Check for Daily Aggregates Queries
  for (const kw of QUERY_DAILY_CREDIT_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        intent: 'QUERY_DAILY_CREDIT',
        customer_name: null,
        amount_paise: null,
        transaction_date: getTodayDateString(),
        relative_date_phrase: 'aaj',
        currency: 'INR',
        confidence: 0.95,
        source_transcript: clean
      }
    }
  }

  for (const kw of QUERY_DAILY_PAYMENT_KEYWORDS) {
    if (lower.includes(kw)) {
      const isYesterday = lower.includes('kal')
      return {
        intent: 'QUERY_DAILY_PAYMENTS',
        customer_name: null,
        amount_paise: null,
        transaction_date: isYesterday ? parseRelativeDatePhrase('kal')?.date || getTodayDateString() : getTodayDateString(),
        relative_date_phrase: isYesterday ? 'kal' : 'aaj',
        currency: 'INR',
        confidence: 0.95,
        source_transcript: clean
      }
    }
  }

  // 3. Extract Relative Date (if spoken, e.g. "kal", "parso")
  let transactionDate = getTodayDateString()
  let relativeDatePhrase: string | null = null

  if (lower.includes('kal')) {
    const res = parseRelativeDatePhrase('kal')
    if (res) {
      transactionDate = res.date
      relativeDatePhrase = 'kal'
    }
  } else if (lower.includes('parso')) {
    const res = parseRelativeDatePhrase('parso')
    if (res) {
      transactionDate = res.date
      relativeDatePhrase = 'parso'
    }
  }

  // 4. Extract Amount
  const amountPaise = parseSpokenAmountPaise(clean)

  // 5. Extract Customer Name from speech
  // Patterns like:
  // "Ramesh ka 340 udhaar" -> name: "Ramesh"
  // "Suresh ne 200 diye" -> name: "Suresh"
  // "Ramesh ka total kitna hai" -> name: "Ramesh"
  let extractedName: string | null = null
  const nameMatch = lower.match(/^([a-z\s]+?)\s+(?:ka|ki|ke|ne|ko|se)\b/i)
  if (nameMatch && nameMatch[1]) {
    const potential = normalizeCustomerName(nameMatch[1])
    if (potential && potential.length >= 2 && !['aaj', 'kal', 'parso', 'nahi', 'kripya'].includes(potential)) {
      // Capitalize for display
      extractedName = potential
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
  }

  // 6. Check for Customer Balance Query: "Ramesh ka total?", "Ramesh ka hisaab?"
  const isBalanceQuery = QUERY_BALANCE_KEYWORDS.some((kw) => lower.includes(kw))
  if (isBalanceQuery && extractedName && !amountPaise) {
    return {
      intent: 'QUERY_CUSTOMER_BALANCE',
      customer_name: extractedName,
      amount_paise: null,
      transaction_date: transactionDate,
      relative_date_phrase: relativeDatePhrase,
      currency: 'INR',
      confidence: 0.94,
      source_transcript: clean
    }
  }

  // 7. Check for PAYMENT: "Ramesh ne 200 diye", "200 jama"
  const hasPaymentWord = PAYMENT_KEYWORDS.some((kw) => lower.includes(kw))
  const hasNeWord = lower.includes(' ne ') || lower.includes(' se ')
  if ((hasPaymentWord || hasNeWord) && amountPaise) {
    // If it mentions "udhaar", double check direction
    const hasUdhaar = lower.includes('udhaar') || lower.includes('udhar')
    if (!hasUdhaar || hasNeWord) {
      return {
        intent: 'RECORD_PAYMENT',
        customer_name: extractedName,
        amount_paise: amountPaise,
        transaction_date: transactionDate,
        relative_date_phrase: relativeDatePhrase,
        currency: 'INR',
        confidence: extractedName ? 0.96 : 0.85,
        source_transcript: clean
      }
    }
  }

  // 8. Check for CREDIT: "Ramesh ka 340 udhaar", "Suresh ko 500"
  const hasCreditWord = CREDIT_KEYWORDS.some((kw) => lower.includes(kw))
  if (amountPaise) {
    return {
      intent: 'ADD_CREDIT',
      customer_name: extractedName,
      amount_paise: amountPaise,
      transaction_date: transactionDate,
      relative_date_phrase: relativeDatePhrase,
      currency: 'INR',
      confidence: extractedName ? 0.95 : 0.82,
      source_transcript: clean
    }
  }

  // 9. Fallback to Clarification if uncertain
  return {
    intent: 'CLARIFY',
    customer_name: extractedName,
    amount_paise: null,
    transaction_date: transactionDate,
    relative_date_phrase: relativeDatePhrase,
    currency: 'INR',
    confidence: 0.4,
    source_transcript: clean,
    clarification_reason: 'Uncertain intent or missing amount'
  }
}
