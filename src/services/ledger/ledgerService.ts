import { Customer, CustomerBalance, DailyAggregate, LedgerTransaction, TransactionType, TransactionSource } from '@/types/ledger'
import { addPaise, subtractPaise } from '@/lib/money'
import { getTodayDateString } from '@/lib/dates'
import { isIdempotencyKeyProcessed, markIdempotencyKeyProcessed, generateIdempotencyKey } from '@/lib/idempotency'

export interface CreateTransactionParams {
  shop_id: string
  customer_id: string
  type: TransactionType
  amount_paise: number // Must be positive integer
  effective_date: string // YYYY-MM-DD
  note?: string
  source: TransactionSource
  idempotency_key?: string
  reverses_transaction_id?: string | null
  created_by?: string
  transcript_ref?: string
}

export interface ReversalResult {
  reversalTransaction: LedgerTransaction
  reversedOriginalId: string
  newBalancePaise: number
}

/**
 * Deterministic Ledger Service
 * 
 * Enforces all financial invariants:
 * - Append-only history
 * - Integer paise calculations
 * - Idempotency
 * - Atomic-like state transitions
 */
export class LedgerService {
  /**
   * Computes the deterministic balance for a specific customer from transaction history.
   * 
   * Rule:
   * CREDIT increases balance (+amount)
   * PAYMENT decreases balance (-amount)
   * REVERSAL negates the effect of the target transaction
   */
  static calculateCustomerBalance(
    customerId: string,
    customerName: string,
    transactions: LedgerTransaction[]
  ): CustomerBalance {
    const customerTx = transactions.filter(
      (tx) => tx.customer_id === customerId && tx.status === 'POSTED'
    )

    let balancePaise = 0
    let totalCreditPaise = 0
    let totalPaymentPaise = 0
    let lastDate: string | undefined

    // Map to find reversed transactions easily
    const txMap = new Map<string, LedgerTransaction>()
    for (const tx of customerTx) {
      txMap.set(tx.id, tx)
      if (!lastDate || tx.effective_date > lastDate) {
        lastDate = tx.effective_date
      }
    }

    for (const tx of customerTx) {
      if (tx.type === 'CREDIT') {
        balancePaise = addPaise(balancePaise, tx.amount_paise)
        totalCreditPaise = addPaise(totalCreditPaise, tx.amount_paise)
      } else if (tx.type === 'PAYMENT') {
        balancePaise = subtractPaise(balancePaise, tx.amount_paise)
        totalPaymentPaise = addPaise(totalPaymentPaise, tx.amount_paise)
      } else if (tx.type === 'REVERSAL') {
        // If this reversal targets an original transaction, counteract it
        const original = tx.reverses_transaction_id ? txMap.get(tx.reverses_transaction_id) : null
        if (original) {
          if (original.type === 'CREDIT') {
            // Reversing a credit reduces balance
            balancePaise = subtractPaise(balancePaise, tx.amount_paise)
            totalCreditPaise = subtractPaise(totalCreditPaise, tx.amount_paise)
          } else if (original.type === 'PAYMENT') {
            // Reversing a payment restores balance
            balancePaise = addPaise(balancePaise, tx.amount_paise)
            totalPaymentPaise = subtractPaise(totalPaymentPaise, tx.amount_paise)
          }
        }
      }
    }

    return {
      customer_id: customerId,
      customer_name: customerName,
      balance_paise: balancePaise,
      total_credit_paise: totalCreditPaise,
      total_payment_paise: totalPaymentPaise,
      transaction_count: customerTx.length,
      last_transaction_date: lastDate
    }
  }

  /**
   * Computes daily financial aggregates for a given date in Asia/Kolkata.
   */
  static calculateDailyAggregates(date: string, transactions: LedgerTransaction[]): DailyAggregate {
    const dayTransactions = transactions.filter(
      (tx) => tx.effective_date === date && tx.status === 'POSTED'
    )

    let totalCreditPaise = 0
    let totalPaymentPaise = 0
    let creditCount = 0
    let paymentCount = 0

    for (const tx of dayTransactions) {
      if (tx.type === 'CREDIT') {
        totalCreditPaise = addPaise(totalCreditPaise, tx.amount_paise)
        creditCount++
      } else if (tx.type === 'PAYMENT') {
        totalPaymentPaise = addPaise(totalPaymentPaise, tx.amount_paise)
        paymentCount++
      }
    }

    return {
      date,
      total_credit_paise: totalCreditPaise,
      total_payment_paise: totalPaymentPaise,
      credit_count: creditCount,
      payment_count: paymentCount,
      net_credit_paise: subtractPaise(totalCreditPaise, totalPaymentPaise)
    }
  }

  /**
   * Computes total outstanding credit across all active customers.
   */
  static calculateTotalOutstanding(customers: Customer[], transactions: LedgerTransaction[]): number {
    let totalOutstandingPaise = 0
    for (const customer of customers) {
      if (!customer.archived_at) {
        const bal = this.calculateCustomerBalance(customer.id, customer.display_name, transactions)
        // Add positive balance (money owed by customer to shop)
        if (bal.balance_paise > 0) {
          totalOutstandingPaise = addPaise(totalOutstandingPaise, bal.balance_paise)
        }
      }
    }
    return totalOutstandingPaise
  }

  /**
   * Creates and records a new transaction with idempotency and validation checks.
   */
  static createTransaction(
    params: CreateTransactionParams,
    existingTransactions: LedgerTransaction[]
  ): { transaction: LedgerTransaction; isDuplicate: boolean } {
    const idempotencyKey = params.idempotency_key || generateIdempotencyKey()

    // 1. Check if idempotency key has already been processed
    if (isIdempotencyKeyProcessed(idempotencyKey)) {
      const existing = existingTransactions.find((tx) => tx.idempotency_key === idempotencyKey)
      if (existing) {
        return { transaction: existing, isDuplicate: true }
      }
    }

    // Check against existing transactions list
    const existingTx = existingTransactions.find(
      (tx) => tx.shop_id === params.shop_id && tx.idempotency_key === idempotencyKey
    )
    if (existingTx) {
      markIdempotencyKeyProcessed(idempotencyKey)
      return { transaction: existingTx, isDuplicate: true }
    }

    // 2. Validate amount in paise
    if (!Number.isInteger(params.amount_paise) || params.amount_paise <= 0) {
      throw new Error(`Amount must be a positive integer in paise, got: ${params.amount_paise}`)
    }

    // 3. Assemble immutable transaction record
    const newTx: LedgerTransaction = {
      id: generateIdempotencyKey(),
      shop_id: params.shop_id,
      customer_id: params.customer_id,
      type: params.type,
      amount_paise: params.amount_paise,
      effective_date: params.effective_date || getTodayDateString(),
      created_at: new Date().toISOString(),
      note: params.note,
      source: params.source,
      idempotency_key: idempotencyKey,
      reverses_transaction_id: params.reverses_transaction_id || null,
      created_by: params.created_by,
      status: 'POSTED',
      transcript_ref: params.transcript_ref
    }

    markIdempotencyKeyProcessed(idempotencyKey)
    return { transaction: newTx, isDuplicate: false }
  }

  /**
   * Creates an append-only reversal of a posted transaction.
   * Never mutates or deletes the original record.
   */
  static reverseTransaction(
    targetTransactionId: string,
    existingTransactions: LedgerTransaction[],
    reason: string = 'Correction request'
  ): ReversalResult {
    const original = existingTransactions.find((tx) => tx.id === targetTransactionId)
    if (!original) {
      throw new Error(`Transaction with ID ${targetTransactionId} not found`)
    }

    if (original.type === 'REVERSAL') {
      throw new Error('Cannot reverse a transaction that is already a reversal')
    }

    const idempotencyKey = `rev_${original.id}_${Date.now()}`

    const reversalTx: LedgerTransaction = {
      id: generateIdempotencyKey(),
      shop_id: original.shop_id,
      customer_id: original.customer_id,
      type: 'REVERSAL',
      amount_paise: original.amount_paise,
      effective_date: getTodayDateString(),
      created_at: new Date().toISOString(),
      note: `Reversed transaction ${original.id.slice(0, 8)}: ${reason}`,
      source: 'CORRECTION',
      idempotency_key: idempotencyKey,
      reverses_transaction_id: original.id,
      status: 'POSTED'
    }

    // Calculate updated balance
    const updatedHistory = [...existingTransactions, reversalTx]
    const balance = this.calculateCustomerBalance(
      original.customer_id,
      'Customer',
      updatedHistory
    )

    return {
      reversalTransaction: reversalTx,
      reversedOriginalId: original.id,
      newBalancePaise: balance.balance_paise
    }
  }
}
