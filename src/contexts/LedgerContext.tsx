import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { Customer, CustomerBalance, DailyAggregate, LedgerTransaction, InventoryItem } from '@/types/ledger'
import { INITIAL_DEMO_CUSTOMERS, INITIAL_DEMO_TRANSACTIONS, DEMO_SHOP } from '@/services/mock/mockData'
import { LedgerService, CreateTransactionParams } from '@/services/ledger/ledgerService'
import { normalizeCustomerName } from '@/services/ledger/customerResolver'
import { getTodayDateString } from '@/lib/dates'
import { localDb } from '@/lib/indexedDb'
import { formatINR } from '@/lib/money'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/services/database/supabaseClient'
import { INITIAL_INVENTORY_ITEMS } from '@/services/inventory/inventoryService'

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
  addCustomer: (displayName: string, phone?: string, notes?: string, aliases?: string[]) => Promise<Customer>
  editCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>
  archiveCustomer: (id: string) => Promise<void>
  addCustomerAlias: (customerId: string, alias: string) => Promise<Customer>
  removeCustomerAlias: (customerId: string, alias: string) => Promise<Customer>
  lastRecordedTx: LedgerTransaction | null
  undoLastTransaction: () => Promise<LedgerTransaction | null>
  dismissUndoToast: () => void
  isInventoryEnabled: boolean
  toggleInventoryModule: (enabled: boolean) => void
  inventoryItems: InventoryItem[]
  addInventoryItem: (itemName: string, quantity: number, unit: string, pricePaise: number, minStock?: number) => Promise<InventoryItem>
  updateInventoryStock: (itemId: string, delta: number) => Promise<InventoryItem>
  resetDemoData: () => Promise<void>
  exportLedgerCsv: () => void
  isLoading: boolean
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined)

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { shop, isAuthenticated, isDemoAccount } = useAuth()
  const activeShopId = shop?.id || DEMO_SHOP.id

  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (isDemoAccount) return INITIAL_DEMO_CUSTOMERS
    return []
  })
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(() => {
    if (isDemoAccount) return INITIAL_DEMO_TRANSACTIONS
    return []
  })
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [lastRecordedTx, setLastRecordedTx] = useState<LedgerTransaction | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Optional Inventory Module State
  const [isInventoryEnabled, setIsInventoryEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('khata_ai_inventory_enabled') === 'true'
    }
    return false
  })

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`khata_ai_inv_${activeShopId}`)
      if (saved) {
        try { return JSON.parse(saved) } catch {}
      }
    }
    return isDemoAccount
      ? INITIAL_INVENTORY_ITEMS.map((item) => ({ ...item, shop_id: activeShopId }))
      : []
  })

  const toggleInventoryModule = (enabled: boolean) => {
    setIsInventoryEnabled(enabled)
    localStorage.setItem('khata_ai_inventory_enabled', String(enabled))
  }

  const dismissUndoToast = () => setLastRecordedTx(null)

  // Initialize data on mount or shop switch
  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setIsLoading(true)
      try {
        if (isDemoAccount) {
          // Pre-loaded Demo Account (Sharma Kirana Store)
          await localDb.initializeDemoDataIfEmpty()
          const cachedCustomers = await localDb.getAll<Customer>('customers')
          const cachedTx = await localDb.getAll<LedgerTransaction>('transactions')

          if (mounted) {
            setCustomers(cachedCustomers && cachedCustomers.length > 0 ? cachedCustomers : INITIAL_DEMO_CUSTOMERS)
            setTransactions(cachedTx && cachedTx.length > 0 ? cachedTx : INITIAL_DEMO_TRANSACTIONS)
          }
        } else {
          // Real User / Newly Created Shop: Clean data, no dummy customers
          if (isSupabaseConfigured && supabase && isAuthenticated && shop) {
            try {
              const { data: cloudCustomers } = await supabase
                .from('customers')
                .select('*')
                .eq('shop_id', shop.id)
                .is('archived_at', null)

              const { data: cloudTx } = await supabase
                .from('ledger_transactions')
                .select('*')
                .eq('shop_id', shop.id)
                .order('effective_date', { ascending: false })

              if (mounted) {
                setCustomers(cloudCustomers || [])
                setTransactions(cloudTx || [])
              }
              if (mounted) setIsLoading(false)
              return
            } catch (cloudErr) {
              console.warn('Cloud ledger fetch error, falling back to local storage:', cloudErr)
            }
          }

          // Offline / Local storage scoped to this shop only
          const cachedCustomers = await localDb.getAll<Customer>('customers')
          const cachedTx = await localDb.getAll<LedgerTransaction>('transactions')

          if (mounted) {
            const filteredCust = cachedCustomers.filter((c) => c.shop_id === activeShopId && !c.archived_at)
            const filteredTx = cachedTx.filter((t) => t.shop_id === activeShopId)
            setCustomers(filteredCust)
            setTransactions(filteredTx)
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
  }, [shop?.id, isAuthenticated, isDemoAccount, activeShopId])

  // Save inventory changes to local storage
  const saveInventory = (items: InventoryItem[]) => {
    setInventoryItems(items)
    localStorage.setItem(`khata_ai_inv_${activeShopId}`, JSON.stringify(items))
  }

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
        setLastRecordedTx(result.transaction)

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

  // Undo the most recent transaction
  const undoLastTransaction = useCallback(async () => {
    const target = lastRecordedTx || transactions[0]
    if (!target) return null

    const reversal = await reverseTransaction(target.id, 'Spoken or 1-tap undo action')
    setLastRecordedTx(null)
    return reversal
  }, [lastRecordedTx, transactions, reverseTransaction])

  // Customer Management
  const addCustomer = useCallback(
    async (displayName: string, phone?: string, notes?: string, aliases: string[] = []) => {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        shop_id: activeShopId,
        display_name: displayName.trim(),
        normalized_name: normalizeCustomerName(displayName),
        aliases: aliases.map((a) => a.trim()).filter(Boolean),
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

  // Alias Management
  const addCustomerAlias = useCallback(
    async (customerId: string, alias: string) => {
      const existing = customers.find((c) => c.id === customerId)
      if (!existing) throw new Error('Customer not found')

      const trimmed = alias.trim()
      if (!trimmed) return existing

      const currentAliases = existing.aliases || []
      if (currentAliases.includes(trimmed)) return existing

      const updated = await editCustomer(customerId, {
        aliases: [...currentAliases, trimmed]
      })

      return updated
    },
    [customers, editCustomer]
  )

  const removeCustomerAlias = useCallback(
    async (customerId: string, alias: string) => {
      const existing = customers.find((c) => c.id === customerId)
      if (!existing) throw new Error('Customer not found')

      const currentAliases = existing.aliases || []
      const updated = await editCustomer(customerId, {
        aliases: currentAliases.filter((a) => a !== alias)
      })

      return updated
    },
    [customers, editCustomer]
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

  // Inventory Management
  const addInventoryItem = useCallback(
    async (itemName: string, quantity: number, unit: string, pricePaise: number, minStock: number = 5) => {
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        shop_id: activeShopId,
        item_name: itemName.trim(),
        normalized_name: itemName.toLowerCase().trim(),
        quantity,
        unit,
        price_paise: pricePaise,
        min_stock_threshold: minStock,
        updated_at: new Date().toISOString()
      }

      const updated = [newItem, ...inventoryItems]
      saveInventory(updated)
      return newItem
    },
    [activeShopId, inventoryItems]
  )

  const updateInventoryStock = useCallback(
    async (itemId: string, delta: number) => {
      const existing = inventoryItems.find((i) => i.id === itemId)
      if (!existing) throw new Error('Inventory item not found')

      const updatedItem = {
        ...existing,
        quantity: Math.max(0, existing.quantity + delta),
        updated_at: new Date().toISOString()
      }

      const updatedList = inventoryItems.map((i) => (i.id === itemId ? updatedItem : i))
      saveInventory(updatedList)
      return updatedItem
    },
    [inventoryItems]
  )

  const resetDemoData = useCallback(async () => {
    if (isDemoAccount) {
      await localDb.resetDemoData()
      setCustomers(INITIAL_DEMO_CUSTOMERS)
      setTransactions(INITIAL_DEMO_TRANSACTIONS)
    } else {
      await localDb.clear('customers').catch(() => {})
      await localDb.clear('transactions').catch(() => {})
      setCustomers([])
      setTransactions([])
    }
    setSelectedCustomerId(null)
  }, [isDemoAccount])

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
        addCustomerAlias,
        removeCustomerAlias,
        lastRecordedTx,
        undoLastTransaction,
        dismissUndoToast,
        isInventoryEnabled,
        toggleInventoryModule,
        inventoryItems,
        addInventoryItem,
        updateInventoryStock,
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
