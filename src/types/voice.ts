import { TransactionType } from './ledger'

export type VoiceSessionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'understanding'
  | 'clarification_required'
  | 'confirm_create_customer'
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
  | 'CREATE_CUSTOMER'
  | 'DAILY_CLOSING_REPORT'
  | 'ANALYTICS_QUERY'
  | 'UNDO_TRANSACTION'
  | 'QUERY_INVENTORY'
  | 'UPDATE_STOCK'

export interface ParsedVoiceIntent {
  intent: VoiceIntentType
  customer_name: string | null
  pronoun_used?: boolean
  amount_paise: number | null
  transaction_date: string | null // YYYY-MM-DD
  relative_date_phrase: string | null
  currency: 'INR'
  confidence: number // 0 to 1.0
  source_transcript: string
  correction_target?: 'PENDING_TRANSACTION' | string | null
  clarification_reason?: string | null
  item_name?: string | null
  item_quantity?: number | null
  analytics_type?: string | null
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
