export type TransactionType = 'CREDIT' | 'PAYMENT' | 'REVERSAL' | 'ADJUSTMENT'

export type TransactionSource = 'VOICE' | 'MANUAL' | 'CORRECTION'

export type TransactionStatus = 'POSTED' | 'VOIDED' | 'PENDING_SYNC'

export type VoiceIntent =
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

export interface Shop {
  id: string
  name: string
  owner_name?: string
  timezone: string // default 'Asia/Kolkata'
  default_language: 'hi' | 'hi-en' | 'en'
  created_at: string
}

export interface UserProfile {
  id: string
  shop_id: string
  role: 'OWNER' | 'STAFF'
  full_name: string
  phone?: string
  created_at: string
}

export interface Customer {
  id: string
  shop_id: string
  display_name: string
  normalized_name: string
  aliases?: string[] // Shop-specific nicknames / titles (e.g. ["मास्टर जी", "शर्मा जी"])
  phone?: string
  notes?: string
  created_at: string
  archived_at?: string | null
}

export interface LedgerTransaction {
  id: string
  shop_id: string
  customer_id: string
  type: TransactionType
  amount_paise: number // Integer paise ONLY (e.g. 34000 = ₹340.00). Must be > 0
  effective_date: string // YYYY-MM-DD
  created_at: string // ISO timestamp
  note?: string
  source: TransactionSource
  idempotency_key: string // Unique per shop
  reverses_transaction_id?: string | null // For REVERSAL / ADJUSTMENT
  created_by?: string
  status: TransactionStatus
  transcript_ref?: string
}

export interface CustomerBalance {
  customer_id: string
  customer_name: string
  balance_paise: number // Positive means customer owes shopkeeper (Udhaar); Negative means advance
  total_credit_paise: number
  total_payment_paise: number
  transaction_count: number
  last_transaction_date?: string
}

export interface DailyAggregate {
  date: string // YYYY-MM-DD
  total_credit_paise: number
  total_payment_paise: number
  credit_count: number
  payment_count: number
  net_credit_paise: number
}

export interface AuditEvent {
  id: string
  shop_id: string
  actor_id?: string
  entity_type: 'CUSTOMER' | 'TRANSACTION' | 'SHOP' | 'AUTH' | 'INVENTORY'
  entity_id: string
  action: 'CREATE' | 'UPDATE' | 'REVERSE' | 'ARCHIVE' | 'LOGIN' | 'SYNC'
  metadata?: Record<string, unknown>
  created_at: string
}

export interface DuplicateCustomerClarification {
  spoken_name: string
  candidates: Customer[]
  pending_intent: {
    type: TransactionType
    amount_paise: number
    effective_date: string
    source: TransactionSource
    idempotency_key: string
    note?: string
  }
}

// =============================================================================
// ADVANCED ENHANCEMENT TYPES
// =============================================================================

/**
 * Short-lived ephemeral multi-turn conversation memory.
 * Preserves active subject across turns (90-sec TTL).
 */
export interface VoiceSessionMemory {
  activeCustomerId: string | null
  activeCustomerName: string | null
  lastTransactionId: string | null
  lastAmountPaise: number | null
  lastIntent: VoiceIntent | null
  lastUpdated: number // Unix millisecond timestamp
}

/**
 * Structured Daily Closing Report (दैनिक रोकड़)
 */
export interface DailyClosingReport {
  date: string
  total_credit_paise: number
  total_payment_paise: number
  net_delta_paise: number
  active_customers_count: number
  new_customers_count: number
  credit_transaction_count: number
  payment_transaction_count: number
  top_debtors_today: { customer_id: string; customer_name: string; amount_paise: number }[]
  top_payments_today: { customer_id: string; customer_name: string; amount_paise: number }[]
  spoken_summary: string
}

/**
 * Debt aging analysis buckets for deterministic analytics
 */
export interface DebtAgingBucket {
  label: string
  days_range: string
  count: number
  total_paise: number
  customer_ids: string[]
}

/**
 * AI-powered Business Analytics (Calculated 100% deterministically)
 */
export interface BusinessAnalytics {
  total_outstanding_paise: number
  active_debtors_count: number
  recovery_rate_percentage: number // (payments / credits) * 100
  aging_buckets: {
    zero_to_seven: DebtAgingBucket
    eight_to_fifteen: DebtAgingBucket
    sixteen_to_thirty: DebtAgingBucket
    thirty_plus: DebtAgingBucket
  }
  top_debtors: CustomerBalance[]
  weekly_credit_paise: number
  weekly_payment_paise: number
}

/**
 * Voice-based Inventory Item (Optional Module)
 */
export interface InventoryItem {
  id: string
  shop_id: string
  item_name: string
  normalized_name: string
  quantity: number
  unit: string // 'packet' | 'kg' | 'litre' | 'piece'
  price_paise: number
  min_stock_threshold: number
  updated_at: string
}
