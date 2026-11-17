export type TransactionType = 'CREDIT' | 'PAYMENT' | 'REVERSAL' | 'ADJUSTMENT'

export type TransactionSource = 'VOICE' | 'MANUAL' | 'CORRECTION'

export type TransactionStatus = 'POSTED' | 'VOIDED' | 'PENDING_SYNC'

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
  balance_paise: number // Positive means customer owes shopkeeper (Udhaar); Negative means shopkeeper owes customer (Advance)
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
  entity_type: 'CUSTOMER' | 'TRANSACTION' | 'SHOP' | 'AUTH'
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
