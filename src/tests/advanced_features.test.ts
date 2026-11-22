import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sessionMemory } from '@/services/voice/voiceSessionMemory'
import { resolveCustomer } from '@/services/ledger/customerResolver'
import { AnalyticsService } from '@/services/ledger/analyticsService'
import { InventoryService, INITIAL_INVENTORY_ITEMS } from '@/services/inventory/inventoryService'
import { LedgerService } from '@/services/ledger/ledgerService'
import { Customer, LedgerTransaction, InventoryItem } from '@/types/ledger'
import { getTodayDateString, getRelativeDateString } from '@/lib/dates'

describe('1. Voice Context Memory & Pronoun Resolution', () => {
  beforeEach(() => {
    sessionMemory.clear()
  })

  it('stores customer in context memory and resolves pronouns', () => {
    sessionMemory.update({
      activeCustomerId: 'cust-ramesh-1',
      activeCustomerName: 'Ramesh Sharma',
      lastAmountPaise: 34000,
      lastIntent: 'ADD_CREDIT'
    })

    expect(sessionMemory.isValid()).toBe(true)
    const mem = sessionMemory.getMemory()
    expect(mem?.activeCustomerId).toBe('cust-ramesh-1')
    expect(mem?.activeCustomerName).toBe('Ramesh Sharma')

    // Test pronoun detection
    expect(sessionMemory.detectPronounReference('Usne 100 rupaye diye')).toBe(true)
    expect(sessionMemory.detectPronounReference('Unka hisaab batao')).toBe(true)
    expect(sessionMemory.detectPronounReference('Inhe 50 rupaye udhaar do')).toBe(true)
    expect(sessionMemory.detectPronounReference('Suresh ka 200 udhaar')).toBe(false)

    // Context resolution
    const resolved = sessionMemory.resolveCustomerFromContext('Usne 100 rupaye diye')
    expect(resolved).not.toBeNull()
    expect(resolved?.customerId).toBe('cust-ramesh-1')
    expect(resolved?.customerName).toBe('Ramesh Sharma')
  })

  it('expires context memory after TTL (90s)', () => {
    vi.useFakeTimers()

    sessionMemory.update({
      activeCustomerId: 'cust-suresh',
      activeCustomerName: 'Suresh Kumar'
    })
    expect(sessionMemory.isValid()).toBe(true)

    // Fast-forward 91 seconds
    vi.advanceTimersByTime(91000)

    expect(sessionMemory.isValid()).toBe(false)
    expect(sessionMemory.getMemory()).toBeNull()

    vi.useRealTimers()
  })
})

describe('2. Shop-Specific Customer Aliases', () => {
  const customers: Customer[] = [
    {
      id: 'cust-1',
      shop_id: 'shop-1',
      display_name: 'Satish Verma',
      normalized_name: 'satish verma',
      aliases: ['मास्टर जी', 'master ji', 'school wale'],
      created_at: new Date().toISOString()
    },
    {
      id: 'cust-2',
      shop_id: 'shop-1',
      display_name: 'Ramesh Gupta',
      normalized_name: 'ramesh gupta',
      aliases: ['पहलवान', 'pehalwan'],
      created_at: new Date().toISOString()
    }
  ]

  it('resolves customer by alias exact match', () => {
    const res = resolveCustomer('Master ji', customers)
    expect(res.type).toBe('EXACT')
    if (res.type === 'EXACT') {
      expect(res.customer.id).toBe('cust-1')
    }
  })

  it('resolves customer by alias in Hindi script', () => {
    const res = resolveCustomer('मास्टर जी', customers)
    expect(res.type).toBe('EXACT')
    if (res.type === 'EXACT') {
      expect(res.customer.id).toBe('cust-1')
    }
  })

  it('resolves customer by nickname/alias pehalwan', () => {
    const res = resolveCustomer('Pehalwan', customers)
    expect(res.type).toBe('EXACT')
    if (res.type === 'EXACT') {
      expect(res.customer.id).toBe('cust-2')
    }
  })
})

describe('3. Deterministic Business Analytics & Aging', () => {
  const today = getTodayDateString()
  const daysAgo10 = getRelativeDateString(-10)
  const daysAgo40 = getRelativeDateString(-40)

  const customers: Customer[] = [
    { id: 'c1', shop_id: 's1', display_name: 'Ramesh', normalized_name: 'ramesh', created_at: today },
    { id: 'c2', shop_id: 's1', display_name: 'Suresh', normalized_name: 'suresh', created_at: today },
    { id: 'c3', shop_id: 's1', display_name: 'Mukesh', normalized_name: 'mukesh', created_at: today }
  ]

  const transactions: LedgerTransaction[] = [
    // Ramesh: ₹500 credit today, ₹100 payment today
    { id: 't1', shop_id: 's1', customer_id: 'c1', type: 'CREDIT', amount_paise: 50000, effective_date: today, created_at: today, source: 'VOICE', idempotency_key: 'k1', status: 'POSTED' },
    { id: 't2', shop_id: 's1', customer_id: 'c1', type: 'PAYMENT', amount_paise: 10000, effective_date: today, created_at: today, source: 'VOICE', idempotency_key: 'k2', status: 'POSTED' },
    // Suresh: ₹300 credit 10 days ago (Bucket 8-15 days)
    { id: 't3', shop_id: 's1', customer_id: 'c2', type: 'CREDIT', amount_paise: 30000, effective_date: daysAgo10, created_at: daysAgo10, source: 'VOICE', idempotency_key: 'k3', status: 'POSTED' },
    // Mukesh: ₹1000 credit 40 days ago (Bucket 30+ days)
    { id: 't4', shop_id: 's1', customer_id: 'c3', type: 'CREDIT', amount_paise: 100000, effective_date: daysAgo40, created_at: daysAgo40, source: 'VOICE', idempotency_key: 'k4', status: 'POSTED' }
  ]

  it('calculates daily closing report with zero floating point inaccuracies', () => {
    const report = AnalyticsService.generateDailyClosingReport(today, transactions, customers)

    expect(report.total_credit_paise).toBe(50000)
    expect(report.total_payment_paise).toBe(10000)
    expect(report.net_delta_paise).toBe(40000) // 500 - 100 = 400
    expect(report.credit_transaction_count).toBe(1)
    expect(report.payment_transaction_count).toBe(1)
    expect(report.active_customers_count).toBe(1)
  })

  it('calculates debt aging buckets strictly deterministically', () => {
    const analytics = AnalyticsService.calculateBusinessAnalytics(transactions, customers, today)

    // Check aging buckets
    const b0_7 = analytics.aging_buckets.zero_to_seven
    const b8_15 = analytics.aging_buckets.eight_to_fifteen
    const b30_plus = analytics.aging_buckets.thirty_plus

    expect(b0_7.total_paise).toBe(40000) // Ramesh's net balance 400
    expect(b8_15.total_paise).toBe(30000) // Suresh's balance 300
    expect(b30_plus.total_paise).toBe(100000) // Mukesh's balance 1000
    expect(analytics.total_outstanding_paise).toBe(170000) // 400 + 300 + 1000 = 1700
  })

  it('generates natural Hindi spoken closing summary', () => {
    const report = AnalyticsService.generateDailyClosingReport(today, transactions, customers)
    expect(report.spoken_summary).toContain('₹500')
    expect(report.spoken_summary).toContain('₹100')
  })
})

describe('4. Modular Voice Inventory Module', () => {
  const items: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) => ({
    ...item,
    shop_id: 'shop-1'
  }))

  it('correctly identifies inventory items by Hindi/Hinglish speech queries', () => {
    const attaItem = InventoryService.findItemByQuery('atta', items)
    expect(attaItem?.item_name).toContain('आटा')

    const sugarItem = InventoryService.findItemByQuery('chini', items)
    expect(sugarItem?.item_name).toContain('चीनी')

    const oilItem = InventoryService.findItemByQuery('sarso tel', items)
    expect(oilItem?.item_name).toContain('तेल')
  })

  it('updates stock quantities deterministically', () => {
    const initialItem = items[0]
    const updated = InventoryService.updateStock(initialItem, 5)

    expect(updated.quantity).toBe(initialItem.quantity + 5)
  })

  it('flags items below low_stock_threshold', () => {
    const lowStockItems = InventoryService.getLowStockItems(items)

    expect(lowStockItems.length).toBeGreaterThan(0)
    lowStockItems.forEach((item) => {
      expect(item.quantity).toBeLessThanOrEqual(item.min_stock_threshold)
    })
  })
})

describe('5. Auditable Transaction Reversal & Undo', () => {
  it('reverses a transaction by appending an opposite entry', () => {
    const originalTx: LedgerTransaction = {
      id: 'tx-100',
      shop_id: 'shop-1',
      customer_id: 'cust-1',
      type: 'CREDIT',
      amount_paise: 34000,
      effective_date: getTodayDateString(),
      created_at: new Date().toISOString(),
      source: 'VOICE',
      idempotency_key: 'key-100',
      status: 'POSTED'
    }

    const { reversalTransaction, newBalancePaise } = LedgerService.reverseTransaction(
      originalTx.id,
      [originalTx],
      'Accidental entry reversal'
    )

    expect(reversalTransaction.type).toBe('REVERSAL')
    expect(reversalTransaction.amount_paise).toBe(34000)
    expect(reversalTransaction.reverses_transaction_id).toBe('tx-100')
    expect(reversalTransaction.id).not.toBe(originalTx.id)
    expect(newBalancePaise).toBe(0)
  })
})
