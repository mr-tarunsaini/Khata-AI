import { TransactionType } from './ledger'

export type VoiceSessionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'understanding'
  | 'clarification_required'
  | 'saving'
  | 'success'
  | 'error'
  | 'offline'

export type VoiceIntentType =
  | 'ADD_CREDIT'
  | 'RECORD_PAYMENT'
  | 'QUERY_CUSTOMER_BALANCE'
  | 'QUERY_DAILY_CREDIT'
  | 'QUERY_DAILY_PAYMENTS'
  | 'CORRECT_PENDING_TRANSACTION'
  | 'CLARIFY'

export interface ParsedVoiceIntent {
  intent: VoiceIntentType
  customer_name: string | null
  amount_paise: number | null
  transaction_date: string | null // YYYY-MM-DD
  relative_date_phrase: string | null
  currency: 'INR'
  confidence: number // 0 to 1.0
  source_transcript: string
  correction_target?: 'PENDING_TRANSACTION' | string | null
  clarification_reason?: string | null
}

export interface SpeechProviderConfig {
  apiKey?: string
  token?: string
  language: 'hi-IN' | 'en-IN' | 'hi'
  sampleRate?: number
}

export interface SpeechRecognitionResult {
  text: string
  isFinal: boolean
  confidence: number
  language: string
}

export interface SpeechSynthesisResult {
  audioUrl?: string
  audioBlob?: Blob
  spokenText: string
  durationMs?: number
}
