import { describe, it, expect, beforeEach } from 'vitest'
import { rupeesToPaise, paiseToRupees, formatINR, formatSpokenINR, addPaise, subtractPaise } from '@/lib/money'
import { getTodayDateString, getRelativeDateString, parseRelativeDatePhrase } from '@/lib/dates'
import { clearIdempotencyCache, generateIdempotencyKey } from '@/lib/idempotency'
import { LedgerService } from '@/services/ledger/ledgerService'
import { resolveCustomer, normalizeCustomerName } from '@/services/ledger/customerResolver'
import { Customer, LedgerTransaction } from '@/types/ledger'

describe('KhataAI Money Utility & Integer Paise Math', () => {
  it('converts rupees to integer paise without floating point error', () => {
    expect(rupeesToPaise(340)).toBe(34000)
    expect(rupeesToPaise('340')).toBe(34000)
    expect(rupeesToPaise(19.99)).toBe(1999)
    expect(rupeesToPaise(0.5)).toBe(50)
  })

  it('converts paise back to rupees', () => {
    expect(paiseToRupees(34000)).toBe(340)
    expect(paiseToRupees(1999)).toBe(19.99)
  })

  it('formats Indian Rupee notation correctly', () => {
    expect(formatINR(34000)).toBe('₹340')
    expect(formatINR(124000)).toBe('₹1,240')
    expect(formatINR(10000000)).toBe('₹1,00,000') // 1 Lakh
    expect(formatINR(1999)).toBe('₹19.99')
    expect(formatINR(-50000)).toBe('-₹500')
  })

  it('formats spoken INR strings for voice output', () => {
    expect(formatSpokenINR(34000, 'hi')).toBe('340 rupaye')
    expect(formatSpokenINR(124000, 'hi')).toBe('1,240 rupaye')
    expect(formatSpokenINR(50000, 'en')).toBe('500 rupees')
  })

  it('performs exact addition and subtraction', () => {
    expect(addPaise(34000, 20000)).toBe(54000)
    expect(subtractPaise(34000, 20000)).toBe(14000)
  })
})

describe('Deterministic Ledger Calculations', () => {
  const shopId = 'shop-101'
  const customerId = 'cust-ramesh'

  beforeEach(() => {
    clearIdempotencyCache()
  })

  it('CREDIT increases outstanding balance (Ramesh ka 340 udhaar)', () => {
    const transactions: LedgerTransaction[] = [
      {
        id: 'tx-1',
        shop_id: shopId,
        customer_id: customerId,
        type: 'CREDIT',
        amount_paise: 34000, // ₹340
        effective_date: '2026-11-17',
        created_at: new Date().toISOString(),
        source: 'VOICE',
        idempotency_key: 'idemp-1',
        status: 'POSTED'
      }
    ]

    const balance = LedgerService.calculateCustomerBalance(customerId, 'Ramesh', transactions)
    expect(balance.balance_paise).toBe(34000) // ₹340
    expect(balance.total_credit_paise).toBe(34000)
    expect(balance.total_payment_paise).toBe(0)
  })

  it('PAYMENT decreases outstanding balance (Ramesh ne 200 diye -> balance 140)', () => {
    const transactions: LedgerTransaction[] = [
      {
        id: 'tx-1',
        shop_id: shopId,
        customer_id: customerId,
        type: 'CREDIT',
        amount_paise: 34000, // ₹340
        effective_date: '2026-11-17',
        created_at: new Date().toISOString(),
        source: 'VOICE',
        idempotency_key: 'idemp-1',
        status: 'POSTED'
      },
      {
        id: 'tx-2',
        shop_id: shopId,
        customer_id: customerId,
        type: 'PAYMENT',
        amount_paise: 20000, // ₹200
        effective_date: '2026-11-17',
        created_at: new Date().toISOString(),
        source: 'VOICE',
        idempotency_key: 'idemp-2',
        status: 'POSTED'
      }
    ]

    const balance = LedgerService.calculateCustomerBalance(customerId, 'Ramesh', transactions)
    expect(balance.balance_paise).toBe(14000) // ₹140
    expect(balance.total_credit_paise).toBe(34000)
    expect(balance.total_payment_paise).toBe(20000)
  })

  it('REVERSAL cleanly reverses an uncommitted or erroneous transaction without mutating history', () => {
    const originalTx: LedgerTransaction = {
      id: 'tx-1',
      shop_id: shopId,
      customer_id: customerId,
      type: 'CREDIT',
      amount_paise: 34000,
      effective_date: '2026-11-17',
      created_at: new Date().toISOString(),
      source: 'VOICE',
      idempotency_key: 'idemp-1',
      status: 'POSTED'
    }

    const { reversalTransaction, newBalancePaise } = LedgerService.reverseTransaction(
      'tx-1',
      [originalTx],
      'Customer corrected amount'
    )

    expect(reversalTransaction.type).toBe('REVERSAL')
    expect(reversalTransaction.reverses_transaction_id).toBe('tx-1')
    expect(newBalancePaise).toBe(0)
  })

  it('prevents duplicate transactions with identical idempotency key', () => {
    const existing: LedgerTransaction[] = []
    const key = generateIdempotencyKey()

    const first = LedgerService.createTransaction(
      {
        shop_id: shopId,
        customer_id: customerId,
        type: 'CREDIT',
        amount_paise: 34000,
        effective_date: '2026-11-17',
        source: 'VOICE',
        idempotency_key: key
      },
      existing
    )
    expect(first.isDuplicate).toBe(false)
    existing.push(first.transaction)

    // Repeat identical request
    const second = LedgerService.createTransaction(
      {
        shop_id: shopId,
        customer_id: customerId,
        type: 'CREDIT',
        amount_paise: 34000,
        effective_date: '2026-11-17',
        source: 'VOICE',
        idempotency_key: key
      },
      existing
    )
    expect(second.isDuplicate).toBe(true)
    expect(second.transaction.id).toBe(first.transaction.id)
  })

  it('calculates daily totals accurately', () => {
    const today = getTodayDateString()
    const transactions: LedgerTransaction[] = [
      {
        id: 'tx-1',
        shop_id: shopId,
        customer_id: 'cust-1',
        type: 'CREDIT',
        amount_paise: 34000,
        effective_date: today,
        created_at: new Date().toISOString(),
        source: 'VOICE',
        idempotency_key: 'k-1',
        status: 'POSTED'
      },
      {
        id: 'tx-2',
        shop_id: shopId,
        customer_id: 'cust-2',
        type: 'CREDIT',
        amount_paise: 90000,
        effective_date: today,
        created_at: new Date().toISOString(),
        source: 'VOICE',
        idempotency_key: 'k-2',
        status: 'POSTED'
      },
      {
        id: 'tx-3',
        shop_id: shopId,
        customer_id: 'cust-1',
        type: 'PAYMENT',
        amount_paise: 20000,
        effective_date: today,
        created_at: new Date().toISOString(),
        source: 'VOICE',
        idempotency_key: 'k-3',
        status: 'POSTED'
      }
    ]

    const aggregates = LedgerService.calculateDailyAggregates(today, transactions)
    expect(aggregates.total_credit_paise).toBe(124000) // ₹1,240
    expect(aggregates.total_payment_paise).toBe(20000) // ₹200
    expect(aggregates.credit_count).toBe(2)
    expect(aggregates.payment_count).toBe(1)
  })
})

describe('Customer Resolution & Disambiguation', () => {
  const sampleCustomers: Customer[] = [
    {
      id: 'c-1',
      shop_id: 'shop-1',
      display_name: 'Ramesh Sharma',
      normalized_name: 'ramesh sharma',
      created_at: new Date().toISOString()
    },
    {
      id: 'c-2',
      shop_id: 'shop-1',
      display_name: 'Ramesh Gupta',
      normalized_name: 'ramesh gupta',
      created_at: new Date().toISOString()
    },
    {
      id: 'c-3',
      shop_id: 'shop-1',
      display_name: 'Suresh Kumar',
      normalized_name: 'suresh kumar',
      created_at: new Date().toISOString()
    }
  ]

  it('normalizes names and strips honorifics like "ji" and "bhai"', () => {
    expect(normalizeCustomerName('Ramesh Ji')).toBe('ramesh')
    expect(normalizeCustomerName('Suresh Kumar Bhai')).toBe('suresh kumar')
    expect(normalizeCustomerName('  रमेश जी  ')).toBe('ramesh')
  })

  it('flags ambiguous match when multiple customers share a first name ("Ramesh")', () => {
    const result = resolveCustomer('Ramesh', sampleCustomers)
    expect(result.type).toBe('AMBIGUOUS')
    if (result.type === 'AMBIGUOUS') {
      expect(result.candidates.length).toBe(2)
      expect(result.candidates.map((c) => c.display_name)).toEqual(['Ramesh Sharma', 'Ramesh Gupta'])
    }
  })

  it('resolves unique customer when full name is spoken ("Ramesh Sharma")', () => {
    const result = resolveCustomer('Ramesh Sharma', sampleCustomers)
    expect(result.type).toBe('EXACT')
    if (result.type === 'EXACT') {
      expect(result.customer.id).toBe('c-1')
    }
  })

  it('resolves unique single match ("Suresh")', () => {
    const result = resolveCustomer('Suresh', sampleCustomers)
    expect(result.type).toBe('EXACT')
    if (result.type === 'EXACT') {
      expect(result.customer.id).toBe('c-3')
    }
  })
})

describe('Relative Date Phrases (Asia/Kolkata)', () => {
  it('parses "aaj", "kal", and "parso" properly', () => {
    const todayRes = parseRelativeDatePhrase('aaj')
    expect(todayRes).not.toBeNull()
    expect(todayRes?.offsetDays).toBe(0)

    const kalRes = parseRelativeDatePhrase('kal')
    expect(kalRes).not.toBeNull()
    expect(kalRes?.offsetDays).toBe(-1)

    const parsoRes = parseRelativeDatePhrase('parso')
    expect(parsoRes).not.toBeNull()
    expect(parsoRes?.offsetDays).toBe(-2)
  })
})
