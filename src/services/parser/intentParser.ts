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
    'CLARIFY',
    'CREATE_CUSTOMER',
    'DAILY_CLOSING_REPORT',
    'ANALYTICS_QUERY',
    'UNDO_TRANSACTION',
    'QUERY_INVENTORY',
    'UPDATE_STOCK'
  ]),
  customer_name: z.string().nullable(),
  pronoun_used: z.boolean().optional(),
  amount_paise: z.number().int().positive().nullable(),
  transaction_date: z.string().nullable(),
  relative_date_phrase: z.string().nullable(),
  currency: z.literal('INR'),
  confidence: z.number().min(0).max(1),
  source_transcript: z.string(),
  correction_target: z.string().nullable().optional(),
  clarification_reason: z.string().nullable().optional(),
  item_name: z.string().nullable().optional(),
  item_quantity: z.number().nullable().optional(),
  analytics_type: z.string().nullable().optional()
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

// Keywords indicating DAILY CLOSING REPORT
const DAILY_CLOSING_KEYWORDS = [
  'closing report', 'closing hisaab', 'dukan band hisaab', 'aaj ka hisaab dikhao', 'aaj ka hisab dikhao', 'dokan band', 'daily closing', 'dinaant hisaab'
]

// Keywords indicating ANALYTICS QUERY
const ANALYTICS_KEYWORDS = [
  'analytics', 'sabse zyada udhaar', 'top debtors', 'aging', 'recovery rate', 'vasooli dar', '30 din se', 'purana udhaar', 'analysis'
]

// Keywords indicating UNDO
const UNDO_KEYWORDS = [
  'undo', 'wapas lo', 'cancel karo', 'pichhla undo', 'galat hisaab tha', 'reverse karo', 'undo transaction'
]

// Keywords indicating INVENTORY
const INVENTORY_QUERY_KEYWORDS = [
  'stock kitna hai', 'inventory', 'stock check', 'kitna bacha hai', 'low stock', 'kitne packet hain'
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

  // 1. Check for UNDO
  if (UNDO_KEYWORDS.some((kw) => lower.includes(kw))) {
    return {
      intent: 'UNDO_TRANSACTION',
      customer_name: null,
      amount_paise: null,
      transaction_date: getTodayDateString(),
      relative_date_phrase: null,
      currency: 'INR',
      confidence: 0.98,
      source_transcript: clean
    }
  }

  // 2. Check for Daily Closing Report
  if (DAILY_CLOSING_KEYWORDS.some((kw) => lower.includes(kw))) {
    return {
      intent: 'DAILY_CLOSING_REPORT',
      customer_name: null,
      amount_paise: null,
      transaction_date: getTodayDateString(),
      relative_date_phrase: 'aaj',
      currency: 'INR',
      confidence: 0.97,
      source_transcript: clean
    }
  }

  // 3. Check for Analytics Query
  if (ANALYTICS_KEYWORDS.some((kw) => lower.includes(kw))) {
    return {
      intent: 'ANALYTICS_QUERY',
      customer_name: null,
      amount_paise: null,
      transaction_date: getTodayDateString(),
      relative_date_phrase: null,
      currency: 'INR',
      confidence: 0.96,
      source_transcript: clean
    }
  }

  // 4. Check for Inventory Queries
  if (INVENTORY_QUERY_KEYWORDS.some((kw) => lower.includes(kw))) {
    return {
      intent: 'QUERY_INVENTORY',
      customer_name: null,
      amount_paise: null,
      transaction_date: getTodayDateString(),
      relative_date_phrase: null,
      currency: 'INR',
      confidence: 0.95,
      source_transcript: clean
    }
  }

  // 5. Check for immediate correction: "Nahi, 430", "Galat, 430", "Correction 430"
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

  // 6. Check for Daily Aggregates Queries
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

  // 7. Check for Customer Creation ("Naya grahak Manoj jodo", "Manoj ka naya khata khole", "Is naam ka naya khata jode")
  const isCreateCustomerPhrase =
    lower.includes('naya grahak') ||
    lower.includes('नया ग्राहक') ||
    lower.includes('naya khata') ||
    lower.includes('नया खाता') ||
    lower.includes('khata jodo') ||
    lower.includes('खाता जोड़ो') ||
    lower.includes('khata khole') ||
    lower.includes('khata kholo') ||
    lower.includes('खाता खोलो') ||
    lower.includes('खाता खोलें') ||
    lower.includes('khata banao') ||
    lower.includes('खाता बनाओ') ||
    lower.includes('new customer') ||
    lower.includes('naya customer') ||
    lower.includes('grahak jodo') ||
    lower.includes('customer jodo') ||
    lower.includes('is naam ka') ||
    lower.includes('इस नाम का')

  if (isCreateCustomerPhrase) {
    // Pattern A: "Manoj ka naya khata [jodo/khole/banao]" or "मनोज का नया खाता"
    let newName: string | null = null
    const patternA = clean.match(/(?:^|\b)([a-zA-Z\u0900-\u097F\s]{2,25}?)\s+(?:ka|ki|ke|का|की|के)\s+(?:naya\s+|नया\s+)?(?:khata|grahak|customer|खाता|ग्राहक|कस्टमर)/i)
    if (patternA && patternA[1]) {
      const candidate = patternA[1].trim()
      if (!['is', 'iska', 'is naam', 'aaj', 'kal', 'parso', 'इस', 'इस नाम'].includes(candidate.toLowerCase())) {
        newName = candidate
      }
    }

    // Pattern B: "Naya khata/grahak Manoj [jodo/add]" or "नया खाता मनोज"
    if (!newName) {
      const patternB = clean.match(/(?:naya\s+khata|naya\s+grahak|naya\s+customer|new\s+customer|khata|grahak|नया\s+खाता|नया\s+ग्राहक)\s+([a-zA-Z\u0900-\u097F\s]{2,25}?)(?:\s+(?:jodo|khole|kholo|banao|add|karo|जोड़ो|खोलो|खोलें|बनाओ)|$)/i)
      if (patternB && patternB[1]) {
        const candidate = patternB[1].trim()
        if (!['is', 'iska', 'is naam', 'aaj', 'kal', 'parso', 'इस', 'इस नाम'].includes(candidate.toLowerCase())) {
          newName = candidate
        }
      }
    }

    return {
      intent: 'CREATE_CUSTOMER',
      customer_name: newName ? newName.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : null,
      amount_paise: null,
      transaction_date: getTodayDateString(),
      relative_date_phrase: null,
      currency: 'INR',
      confidence: 0.96,
      source_transcript: clean
    }
  }

  // 8. Extract Relative Date (if spoken, e.g. "kal", "parso")
  let transactionDate = getTodayDateString()
  let relativeDatePhrase: string | null = null

  if (lower.includes('kal') || lower.includes('कल')) {
    const res = parseRelativeDatePhrase('kal')
    if (res) {
      transactionDate = res.date
      relativeDatePhrase = 'kal'
    }
  } else if (lower.includes('parso') || lower.includes('परसों')) {
    const res = parseRelativeDatePhrase('parso')
    if (res) {
      transactionDate = res.date
      relativeDatePhrase = 'parso'
    }
  }

  // 9. Extract Amount
  const amountPaise = parseSpokenAmountPaise(clean)

  // 10. Extract Customer Name or Pronoun from speech (Supports Latin and Devanagari Hindi)
  let extractedName: string | null = null
  const pronounMatch = lower.match(/\b(usne|uske|uska|uski|unka|unki|unke|unhone|inhe|inka|inke|inki|inhone|isne|wahi|same|he|she|him)\b/i)

  // Matches customer name followed by Hindi/Hinglish postposition
  // Supports Latin ("Ramesh ka", "Tarun ne") and Devanagari ("रमेश का", "तरुण ने")
  const nameMatch = clean.match(/(?:^|\s+(?:aaj|kal|parso|aaj\s+ka|bhai|bhaiya|ji|shree|mr|shri|आज|कल|परसों|भाई)\s+)?([a-zA-Z\u0900-\u097F\s]{2,25}?)\s+(?:ka|ki|ke|ne|ko|se|का|की|के|ने|को|से)(?:\s+|$)/i)
  if (nameMatch && nameMatch[1]) {
    const raw = nameMatch[1].trim()
    const potential = normalizeCustomerName(raw)
    const ignoreList = ['aaj', 'kal', 'parso', 'nahi', 'kripya', 'bhai', 'bhaiya', 'is', 'iska', 'aaj ka', 'aajka', 'आज', 'कल', 'परसों', 'भाई']
    if (potential && potential.length >= 2 && !ignoreList.includes(potential.toLowerCase())) {
      extractedName = raw
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    }
  }

  // 11. Check for Customer Balance Query: "Ramesh ka total?", "Ramesh ka hisaab?"
  const isBalanceQuery = QUERY_BALANCE_KEYWORDS.some((kw) => lower.includes(kw))
  if (isBalanceQuery && (extractedName || pronounMatch) && !amountPaise) {
    return {
      intent: 'QUERY_CUSTOMER_BALANCE',
      customer_name: extractedName,
      pronoun_used: Boolean(pronounMatch),
      amount_paise: null,
      transaction_date: transactionDate,
      relative_date_phrase: relativeDatePhrase,
      currency: 'INR',
      confidence: 0.94,
      source_transcript: clean
    }
  }

  // 12. Check for PAYMENT: "Ramesh ne 200 diye", "200 jama"
  const hasPaymentWord = PAYMENT_KEYWORDS.some((kw) => lower.includes(kw))
  const hasNeWord = lower.includes(' ne ') || lower.includes(' se ')
  if ((hasPaymentWord || hasNeWord) && amountPaise) {
    const hasUdhaar = lower.includes('udhaar') || lower.includes('udhar')
    if (!hasUdhaar || hasNeWord) {
      return {
        intent: 'RECORD_PAYMENT',
        customer_name: extractedName,
        pronoun_used: Boolean(pronounMatch && !extractedName),
        amount_paise: amountPaise,
        transaction_date: transactionDate,
        relative_date_phrase: relativeDatePhrase,
        currency: 'INR',
        confidence: extractedName ? 0.96 : 0.85,
        source_transcript: clean
      }
    }
  }

  // 13. Check for CREDIT: "Ramesh ka 340 udhaar", "Suresh ko 500"
  if (amountPaise) {
    return {
      intent: 'ADD_CREDIT',
      customer_name: extractedName,
      pronoun_used: Boolean(pronounMatch && !extractedName),
      amount_paise: amountPaise,
      transaction_date: transactionDate,
      relative_date_phrase: relativeDatePhrase,
      currency: 'INR',
      confidence: extractedName ? 0.95 : 0.82,
      source_transcript: clean
    }
  }

  // 14. Fallback to Clarification if uncertain
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
