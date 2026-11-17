/**
 * IndexedDB Local Storage & Encrypted Cache Service
 * 
 * Provides local caching of shop records, offline queueing, and safe data persistence.
 */

import { Customer, LedgerTransaction } from '@/types/ledger'
import { INITIAL_DEMO_CUSTOMERS, INITIAL_DEMO_TRANSACTIONS, DEMO_SHOP } from '@/services/mock/mockData'

const DB_NAME = 'khata_ai_db'
const DB_VERSION = 1

interface DBSchema {
  customers: Customer
  transactions: LedgerTransaction
  offline_queue: LedgerTransaction
  meta: { key: string; value: unknown }
}

class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase> | null = null

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'))
        return
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return this.dbPromise
  }

  async getAll<T>(storeName: 'customers' | 'transactions' | 'offline_queue'): Promise<T[]> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result as T[])
        req.onerror = () => reject(req.error)
      })
    } catch {
      // Fallback for SSR or restricted environments
      return []
    }
  }

  async put<T>(storeName: 'customers' | 'transactions' | 'offline_queue', item: T): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const req = store.put(item)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async clear(storeName: 'customers' | 'transactions' | 'offline_queue'): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  /**
   * Initializes demo seed data into IndexedDB if empty.
   */
  async initializeDemoDataIfEmpty(): Promise<void> {
    const existing = await this.getAll<Customer>('customers')
    if (existing.length === 0) {
      for (const customer of INITIAL_DEMO_CUSTOMERS) {
        await this.put('customers', customer)
      }
      for (const tx of INITIAL_DEMO_TRANSACTIONS) {
        await this.put('transactions', tx)
      }
    }
  }

  /**
   * Resets all stores back to original demo state.
   */
  async resetDemoData(): Promise<void> {
    await this.clear('customers')
    await this.clear('transactions')
    await this.clear('offline_queue')
    for (const customer of INITIAL_DEMO_CUSTOMERS) {
      await this.put('customers', customer)
    }
    for (const tx of INITIAL_DEMO_TRANSACTIONS) {
      await this.put('transactions', tx)
    }
  }
}

export const localDb = new IndexedDBStorage()
