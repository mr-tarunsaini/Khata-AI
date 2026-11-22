/**
 * Deterministic Business Analytics & Daily Closing Service for KhataAI
 * 
 * Complies with strict core architecture rules:
 * - 100% deterministic arithmetic in TypeScript
 * - ZERO LLM-generated math or balance hallucinations
 * - Strict integer paise calculations
 */

import { Customer, LedgerTransaction, DailyClosingReport, BusinessAnalytics, DebtAgingBucket, CustomerBalance } from '@/types/ledger'
import { LedgerService } from './ledgerService'
import { getTodayDateString } from '@/lib/dates'
import { formatINR } from '@/lib/money'

export class AnalyticsService {
  /**
   * Generates comprehensive Daily Closing Statement (दैनिक रोकड़) for a specific date
   */
  static generateDailyClosingReport(
    date: string = getTodayDateString(),
    transactions: LedgerTransaction[],
    customers: Customer[]
  ): DailyClosingReport {
    const dayTx = transactions.filter((t) => t.effective_date === date && t.status === 'POSTED')

    let totalCreditPaise = 0
    let totalPaymentPaise = 0
    let creditCount = 0
    let paymentCount = 0

    const customerCreditMap = new Map<string, number>()
    const customerPaymentMap = new Map<string, number>()
    const activeCustomerIds = new Set<string>()

    for (const tx of dayTx) {
      activeCustomerIds.add(tx.customer_id)
      if (tx.type === 'CREDIT') {
        totalCreditPaise += tx.amount_paise
        creditCount++
        const prev = customerCreditMap.get(tx.customer_id) || 0
        customerCreditMap.set(tx.customer_id, prev + tx.amount_paise)
      } else if (tx.type === 'PAYMENT') {
        totalPaymentPaise += tx.amount_paise
        paymentCount++
        const prev = customerPaymentMap.get(tx.customer_id) || 0
        customerPaymentMap.set(tx.customer_id, prev + tx.amount_paise)
      } else if (tx.type === 'REVERSAL') {
        // Find original transaction
        const orig = transactions.find((t) => t.id === tx.reverses_transaction_id)
        if (orig?.type === 'CREDIT') {
          totalCreditPaise -= tx.amount_paise
        } else if (orig?.type === 'PAYMENT') {
          totalPaymentPaise -= tx.amount_paise
        }
      }
    }

    const netDeltaPaise = totalCreditPaise - totalPaymentPaise

    // Top credit debtors today
    const topDebtorsToday = Array.from(customerCreditMap.entries())
      .map(([cid, amt]) => {
        const cust = customers.find((c) => c.id === cid)
        return {
          customer_id: cid,
          customer_name: cust?.display_name || 'Grahak',
          amount_paise: amt
        }
      })
      .sort((a, b) => b.amount_paise - a.amount_paise)
      .slice(0, 3)

    // Top cash recovery today
    const topPaymentsToday = Array.from(customerPaymentMap.entries())
      .map(([cid, amt]) => {
        const cust = customers.find((c) => c.id === cid)
        return {
          customer_id: cid,
          customer_name: cust?.display_name || 'Grahak',
          amount_paise: amt
        }
      })
      .sort((a, b) => b.amount_paise - a.amount_paise)
      .slice(0, 3)

    // Count new customers registered on this date
    const newCustomersCount = customers.filter((c) => c.created_at.startsWith(date)).length

    // Natural spoken Hindi summary
    const creditStr = formatINR(totalCreditPaise)
    const paymentStr = formatINR(totalPaymentPaise)
    const netStr = formatINR(Math.abs(netDeltaPaise))

    const spokenSummary = `आज का हिसाब: कुल ${creditStr} का उधार गया, और ${paymentStr} की वसूली हुई। नेट बाज़ार में ${netDeltaPaise >= 0 ? netStr + ' उधार बढ़ा' : netStr + ' की रिकवरी हुई'}।`

    return {
      date,
      total_credit_paise: Math.max(0, totalCreditPaise),
      total_payment_paise: Math.max(0, totalPaymentPaise),
      net_delta_paise: netDeltaPaise,
      active_customers_count: activeCustomerIds.size,
      new_customers_count: newCustomersCount,
      credit_transaction_count: creditCount,
      payment_transaction_count: paymentCount,
      top_debtors_today: topDebtorsToday,
      top_payments_today: topPaymentsToday,
      spoken_summary: spokenSummary
    }
  }

  /**
   * Calculates comprehensive deterministic business analytics & debt aging
   */
  static calculateBusinessAnalytics(
    transactions: LedgerTransaction[],
    customers: Customer[],
    todayDateStr: string = getTodayDateString()
  ): BusinessAnalytics {
    const activeCustomers = customers.filter((c) => !c.archived_at)

    // 1. Calculate balances for all active customers
    const balances: CustomerBalance[] = activeCustomers.map((c) =>
      LedgerService.calculateCustomerBalance(c.id, c.display_name, transactions)
    )

    // 2. Total outstanding debt
    const totalOutstandingPaise = LedgerService.calculateTotalOutstanding(activeCustomers, transactions)

    // 3. Debtors with positive balance (> 0)
    const debtors = balances.filter((b) => b.balance_paise > 0)
    const topDebtors = [...debtors].sort((a, b) => b.balance_paise - a.balance_paise).slice(0, 5)

    // 4. Aging analysis (0-7, 8-15, 16-30, 30+ days)
    const today = new Date(todayDateStr)

    const zeroToSeven: DebtAgingBucket = { label: '0–7 दिन', days_range: '0-7', count: 0, total_paise: 0, customer_ids: [] }
    const eightToFifteen: DebtAgingBucket = { label: '8–15 दिन', days_range: '8-15', count: 0, total_paise: 0, customer_ids: [] }
    const sixteenToThirty: DebtAgingBucket = { label: '16–30 दिन', days_range: '16-30', count: 0, total_paise: 0, customer_ids: [] }
    const thirtyPlus: DebtAgingBucket = { label: '30+ दिन', days_range: '30+', count: 0, total_paise: 0, customer_ids: [] }

    for (const d of debtors) {
      let daysOld = 0
      if (d.last_transaction_date) {
        const txDate = new Date(d.last_transaction_date)
        const diffMs = Math.max(0, today.getTime() - txDate.getTime())
        daysOld = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      }

      if (daysOld <= 7) {
        zeroToSeven.count++
        zeroToSeven.total_paise += d.balance_paise
        zeroToSeven.customer_ids.push(d.customer_id)
      } else if (daysOld <= 15) {
        eightToFifteen.count++
        eightToFifteen.total_paise += d.balance_paise
        eightToFifteen.customer_ids.push(d.customer_id)
      } else if (daysOld <= 30) {
        sixteenToThirty.count++
        sixteenToThirty.total_paise += d.balance_paise
        sixteenToThirty.customer_ids.push(d.customer_id)
      } else {
        thirtyPlus.count++
        thirtyPlus.total_paise += d.balance_paise
        thirtyPlus.customer_ids.push(d.customer_id)
      }
    }

    // 5. Total credit vs payment & Recovery Rate
    let allCreditPaise = 0
    let allPaymentPaise = 0
    for (const tx of transactions) {
      if (tx.status === 'POSTED') {
        if (tx.type === 'CREDIT') allCreditPaise += tx.amount_paise
        if (tx.type === 'PAYMENT') allPaymentPaise += tx.amount_paise
      }
    }

    const recoveryRate = allCreditPaise > 0 ? Math.min(100, Math.round((allPaymentPaise / allCreditPaise) * 100)) : 100

    // 6. Weekly credit & payment (last 7 days)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    let weeklyCreditPaise = 0
    let weeklyPaymentPaise = 0
    for (const tx of transactions) {
      if (tx.status === 'POSTED' && tx.effective_date >= sevenDaysAgoStr) {
        if (tx.type === 'CREDIT') weeklyCreditPaise += tx.amount_paise
        if (tx.type === 'PAYMENT') weeklyPaymentPaise += tx.amount_paise
      }
    }

    return {
      total_outstanding_paise: totalOutstandingPaise,
      active_debtors_count: debtors.length,
      recovery_rate_percentage: recoveryRate,
      aging_buckets: {
        zero_to_seven: zeroToSeven,
        eight_to_fifteen: eightToFifteen,
        sixteen_to_thirty: sixteenToThirty,
        thirty_plus: thirtyPlus
      },
      top_debtors: topDebtors,
      weekly_credit_paise: weeklyCreditPaise,
      weekly_payment_paise: weeklyPaymentPaise
    }
  }
}
