/**
 * Optional Voice-Based Inventory Management Module for Kirana Stores
 * 
 * Provides fast spoken stock lookup and restock logging.
 * Decoupled from core ledger: can be enabled/disabled without affecting financial records.
 */

import { InventoryItem } from '@/types/ledger'
import { localDb } from '@/lib/indexedDb'

export const INITIAL_INVENTORY_ITEMS: Omit<InventoryItem, 'shop_id'>[] = [
  {
    id: 'inv-item-1',
    item_name: 'आशीर्वाद आटा (Aashirvaad Atta 10kg)',
    normalized_name: 'aashirvaad atta 10kg',
    quantity: 8,
    unit: 'packet',
    price_paise: 42000,
    min_stock_threshold: 4,
    updated_at: new Date().toISOString()
  },
  {
    id: 'inv-item-2',
    item_name: 'चीनी (Sugar 1kg)',
    normalized_name: 'sugar chini 1kg',
    quantity: 3, // Low stock!
    unit: 'kg',
    price_paise: 4400,
    min_stock_threshold: 5,
    updated_at: new Date().toISOString()
  },
  {
    id: 'inv-item-3',
    item_name: 'फॉर्च्यून सरसों तेल (Fortune Mustard Oil 1L)',
    normalized_name: 'fortune mustard oil sarso tel 1l',
    quantity: 12,
    unit: 'litre',
    price_paise: 14500,
    min_stock_threshold: 5,
    updated_at: new Date().toISOString()
  },
  {
    id: 'inv-item-4',
    item_name: 'अमूल ताज़ा दूध (Amul Taaza Milk 500ml)',
    normalized_name: 'amul taaza milk doodh 500ml',
    quantity: 15,
    unit: 'packet',
    price_paise: 2700,
    min_stock_threshold: 6,
    updated_at: new Date().toISOString()
  },
  {
    id: 'inv-item-5',
    item_name: 'टाटा नमक (Tata Salt 1kg)',
    normalized_name: 'tata salt namak 1kg',
    quantity: 2, // Low stock!
    unit: 'packet',
    price_paise: 2800,
    min_stock_threshold: 5,
    updated_at: new Date().toISOString()
  }
]

export class InventoryService {
  /**
   * Resolve an item by spoken name (e.g. "Atta", "Cheeni", "Sugar", "Tel")
   */
  static findItemByQuery(spokenQuery: string, items: InventoryItem[]): InventoryItem | null {
    const q = spokenQuery.toLowerCase().trim()
    if (!q) return null

    // Exact normalized match
    const exact = items.find((i) => i.normalized_name.includes(q) || q.includes(i.normalized_name))
    if (exact) return exact

    // Partial token match
    const tokens = q.split(/\s+/)
    return items.find((i) => tokens.some((t) => i.normalized_name.includes(t))) || null
  }

  /**
   * Filter items below minimum stock threshold
   */
  static getLowStockItems(items: InventoryItem[]): InventoryItem[] {
    return items.filter((i) => i.quantity <= i.min_stock_threshold)
  }

  /**
   * Update quantity (add for restock, subtract for sold)
   */
  static updateStock(item: InventoryItem, delta: number): InventoryItem {
    const newQty = Math.max(0, item.quantity + delta)
    return {
      ...item,
      quantity: newQty,
      updated_at: new Date().toISOString()
    }
  }
}
