import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { Customer, CustomerBalance, DailyAggregate, LedgerTransaction } from '@/types/ledger'
import { INITIAL_DEMO_CUSTOMERS, INITIAL_DEMO_TRANSACTIONS, DEMO_SHOP } from '@/services/mock/mockData'
import { LedgerService, CreateTransactionParams } from '@/services/ledger/ledgerService'
import { normalizeCustomerName } from '@/services/ledger/customerResolver'
import { getTodayDateString } from '@/lib/dates'
import { localDb } from '@/lib/indexedDb'
import { formatINR } from '@/lib/money'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/services/database/supabaseClient'

interface LedgerContextType {
  customers: Customer[]
  transactions: LedgerTransaction[]
  customerBalances: Map<string, CustomerBalance>
  totalOutstandingPaise: number
  todayAggregates: DailyAggregate
  selectedCustomerId: string | null
  setSelectedCustomerId: (id: string | null) => void
  addTransaction: (params: Omit<CreateTransactionParams, 'shop_id'>) => Promise<{ transaction: LedgerTransaction; isDuplicate: boolean }>
  reverseTransaction: (targetTransactionId: string, reason?: string) => Promise<LedgerTransaction>
  addCustomer: (displayName: string, phone?: string, notes?: string) => Promise<Customer>
  editCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>
  archiveCustomer: (id: string) => Promise<void>
  resetDemoData: () => Promise<void>
  exportLedgerCsv: () => void
  isLoading: boolean
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined)

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { shop, isAuthenticated } = useAuth()
  const activeShopId = shop?.id || DEMO_SHOP.id

  const [customers, setCustomers] = useState<Customer[]>(INITIAL_DEMO_CUSTOMERS)
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(INITIAL_DEMO_TRANSACTIONS)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Initialize data on mount or shop switch
  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setIsLoading(true)
      try {
        // 1. If Supabase is configured and authenticated, attempt fetching live cloud ledger
        if (isSupabaseConfigured && supabase && isAuthenticated && shop) {
          try {
            const { data: cloudCustomers } = await supabase
              .from('customers')
              .select('*')
              .eq('shop_id', shop.id)

            const { data: cloudTx } = await supabase
              .from('ledger_transactions')
              .select('*')
              .eq('shop_id', shop.id)
              .order('effective_date', { ascending: false })

            if (cloudCustomers && cloudCustomers.length > 0 && mounted) {
              setCustomers(cloudCustomers)
              for (const c of cloudCustomers) {
                await localDb.put('customers', c).catch(() => {})
              }
            }

            if (cloudTx && cloudTx.length > 0 && mounted) {
              setTransactions(cloudTx)
              for (const tx of cloudTx) {
                await localDb.put('transactions', tx).catch(() => {})
              }
            }

            if (cloudCustomers && cloudCustomers.length > 0) {
              if (mounted) setIsLoading(false)
              return
            }
          } catch (cloudErr) {
            console.warn('Cloud ledger fetch error, falling back to local storage:', cloudErr)
          }
        }

        // 2. Load from encrypted IndexedDB cache
        await localDb.initializeDemoDataIfEmpty()
        const cachedCustomers = await localDb.getAll<Customer>('customers')
        const cachedTx = await localDb.getAll<LedgerTransaction>('transactions')

        if (mounted) {
          if (cachedCustomers && cachedCustomers.length > 0) {
            setCustomers(cachedCustomers)
          }
          if (cachedTx && cachedTx.length > 0) {
            setTransactions(cachedTx)
          }
        }
      } catch (e) {
        console.error('Failed to load ledger data:', e)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [shop?.id, isAuthenticated])

  // Calculate customer balances deterministically
  const customerBalances = useMemo(() => {
    const map = new Map<string, CustomerBalance>()
    for (const customer of customers) {
      const balance = LedgerService.calculateCustomerBalance(customer.id, customer.display_name, transactions)
      map.set(customer.id, balance)
    }
    return map
  }, [customers, transactions])

  // Total outstanding credit across all active customers
  const totalOutstandingPaise = useMemo(() => {
    return LedgerService.calculateTotalOutstanding(customers, transactions)
  }, [customers, transactions])

  // Today's credit and payment totals
  const todayAggregates = useMemo(() => {
    const today = getTodayDateString()
    return LedgerService.calculateDailyAggregates(today, transactions)
  }, [transactions])

  // Add transaction with idempotency, append-only persistence & cloud sync
  const addTransaction = useCallback(
    async (params: Omit<CreateTransactionParams, 'shop_id'>) => {
      const result = LedgerService.createTransaction(
        {
          ...params,
          shop_id: activeShopId
        },
        transactions
      )

      if (!result.isDuplicate) {
        setTransactions((prev) => [result.transaction, ...prev])

        // Local IndexedDB persistence
        try {
          await localDb.put('transactions', result.transaction)
        } catch (e) {
          console.error('Error persisting transaction to IndexedDB:', e)
        }

        // Cloud Supabase sync if online and authenticated
        if (isSupabaseConfigured && supabase && isAuthenticated) {
          try {
            await supabase.from('ledger_transactions').insert({
              id: result.transaction.id,
              shop_id: result.transaction.shop_id,
              customer_id: result.transaction.customer_id,
              type: result.transaction.type,
              amount_paise: result.transaction.amount_paise,
              effective_date: result.transaction.effective_date,
              created_at: result.transaction.created_at,
              note: result.transaction.note,
              source: result.transaction.source,
              idempotency_key: result.transaction.idempotency_key,
              status: result.transaction.status,
              transcript_ref: result.transaction.transcript_ref
            })
          } catch (syncErr) {
            console.warn('Supabase transaction sync error (queued locally):', syncErr)
          }
        }
      }

      return result
    },
    [transactions, activeShopId, isAuthenticated]
  )

  // Reverse transaction cleanly without deleting or mutating original
  const reverseTransaction = useCallback(
    async (targetTransactionId: string, reason: string = 'Correction request') => {
      const result = LedgerService.reverseTransaction(targetTransactionId, transactions, reason)
      setTransactions((prev) => [result.reversalTransaction, ...prev])

      try {
        await localDb.put('transactions', result.reversalTransaction)
      } catch (e) {
        console.error('Error persisting reversal to IndexedDB:', e)
      }

      if (isSupabaseConfigured && supabase && isAuthenticated) {
        try {
          await supabase.from('ledger_transactions').insert({
            id: result.reversalTransaction.id,
            shop_id: result.reversalTransaction.shop_id,
            customer_id: result.reversalTransaction.customer_id,
            type: result.reversalTransaction.type,
            amount_paise: result.reversalTransaction.amount_paise,
            effective_date: result.reversalTransaction.effective_date,
            created_at: result.reversalTransaction.created_at,
            note: result.reversalTransaction.note,
            source: result.reversalTransaction.source,
            idempotency_key: result.reversalTransaction.idempotency_key,
            reverses_transaction_id: result.reversalTransaction.reverses_transaction_id,
            status: result.reversalTransaction.status
          })
        } catch (syncErr) {
          console.warn('Supabase reversal sync error:', syncErr)
        }
      }

      return result.reversalTransaction
    },
    [transactions, isAuthenticated]
  )

  // Customer Management
  const addCustomer = useCallback(
    async (displayName: string, phone?: string, notes?: string) => {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        shop_id: activeShopId,
        display_name: displayName.trim(),
        normalized_name: normalizeCustomerName(displayName),
        phone: phone?.trim(),
        notes: notes?.trim(),
        created_at: new Date().toISOString(),
        archived_at: null
      }

      setCustomers((prev) => [newCustomer, ...prev])

      try {
        await localDb.put('customers', newCustomer)
      } catch (e) {
        console.error('Error saving customer to IndexedDB:', e)
      }

      if (isSupabaseConfigured && supabase && isAuthenticated) {
        try {
          await supabase.from('customers').insert({
            id: newCustomer.id,
            shop_id: newCustomer.shop_id,
            display_name: newCustomer.display_name,
            normalized_name: newCustomer.normalized_name,
            notes: newCustomer.notes
          })
        } catch (syncErr) {
          console.warn('Supabase customer sync error:', syncErr)
        }
      }

      return newCustomer
    },
    [activeShopId, isAuthenticated]
  )

  const editCustomer = useCallback(
    async (id: string, updates: Partial<Customer>) => {
      const existing = customers.find((c) => c.id === id)
      if (!existing) throw new Error('Customer not found')

      const updated: Customer = {
        ...existing,
        ...updates,
        normalized_name: updates.display_name ? normalizeCustomerName(updates.display_name) : existing.normalized_name
      }

      setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)))

      try {
        await localDb.put('customers', updated)
      } catch (e) {
        console.error('Error updating customer in IndexedDB:', e)
      }

      if (isSupabaseConfigured && supabase && isAuthenticated) {
        try {
          await supabase
            .from('customers')
            .update({
              display_name: updated.display_name,
              normalized_name: updated.normalized_name,
              notes: updated.notes
            })
            .eq('id', id)
        } catch (syncErr) {
          console.warn('Supabase customer update error:', syncErr)
        }
      }

      return updated
    },
    [customers, isAuthenticated]
  )

  const archiveCustomer = useCallback(
    async (id: string) => {
      const existing = customers.find((c) => c.id === id)
      if (!existing) return

      const updated: Customer = {
        ...existing,
        archived_at: new Date().toISOString()
      }

      setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)))

      try {
        await localDb.put('customers', updated)
      } catch (e) {
        console.error('Error archiving customer in IndexedDB:', e)
      }

      if (isSupabaseConfigured && supabase && isAuthenticated) {
        try {
          await supabase
            .from('customers')
            .update({ archived_at: updated.archived_at })
            .eq('id', id)
        } catch (syncErr) {
          console.warn('Supabase customer archive error:', syncErr)
        }
      }
    },
    [customers, isAuthenticated]
  )

  const resetDemoData = useCallback(async () => {
    await localDb.resetDemoData()
    setCustomers(INITIAL_DEMO_CUSTOMERS)
    setTransactions(INITIAL_DEMO_TRANSACTIONS)
    setSelectedCustomerId(null)
  }, [])

  // Export Chronological Ledger to CSV
  const exportLedgerCsv = useCallback(() => {
    const headers = ['Date', 'Customer', 'Type', 'Amount (INR)', 'Source', 'Status', 'Idempotency Key', 'Note']
    const rows = transactions.map((tx) => {
      const customer = customers.find((c) => c.id === tx.customer_id)
      return [
        tx.effective_date,
        `"${customer?.display_name || 'Unknown'}"`,
        tx.type,
        formatINR(tx.amount_paise, { showSymbol: false }),
        tx.source,
        tx.status,
        tx.idempotency_key,
        `"${tx.note || ''}"`
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `KhataAI_Ledger_Export_${getTodayDateString()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [transactions, customers])

  return (
    <LedgerContext.Provider
      value={{
        customers,
        transactions,
        customerBalances,
        totalOutstandingPaise,
        todayAggregates,
        selectedCustomerId,
        setSelectedCustomerId,
        addTransaction,
        reverseTransaction,
        addCustomer,
        editCustomer,
        archiveCustomer,
        resetDemoData,
        exportLedgerCsv,
        isLoading
      }}
    >
      {children}
    </LedgerContext.Provider>
  )
}

export function useLedger() {
  const context = useContext(LedgerContext)
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider')
  }
  return context
}
