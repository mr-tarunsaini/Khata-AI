import { Customer, LedgerTransaction, Shop } from '@/types/ledger'
import { getRelativeDateString, getTodayDateString } from '@/lib/dates'

export const DEMO_SHOP: Shop = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Sharma Kirana Store',
  owner_name: 'Rajesh Sharma',
  timezone: 'Asia/Kolkata',
  default_language: 'hi',
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
}

export const INITIAL_DEMO_CUSTOMERS: Customer[] = [
  {
    id: 'cust-ramesh-sharma',
    shop_id: DEMO_SHOP.id,
    display_name: 'Ramesh Sharma',
    normalized_name: 'ramesh sharma',
    phone: '+91 98765 43210',
    notes: 'Near Gali No. 4, Regular Kirana buyer',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    archived_at: null
  },
  {
    id: 'cust-ramesh-gupta',
    shop_id: DEMO_SHOP.id,
    display_name: 'Ramesh Gupta',
    normalized_name: 'ramesh gupta',
    phone: '+91 98765 12345',
    notes: 'Sweet Shop Owner, Sector 2',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    archived_at: null
  },
  {
    id: 'cust-suresh-kumar',
    shop_id: DEMO_SHOP.id,
    display_name: 'Suresh Kumar',
    normalized_name: 'suresh kumar',
    phone: '+91 91234 56789',
    notes: 'Tailor shop next door',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    archived_at: null
  },
  {
    id: 'cust-amit-verma',
    shop_id: DEMO_SHOP.id,
    display_name: 'Amit Verma',
    normalized_name: 'amit verma',
    phone: '+91 99887 76655',
    notes: 'Milk dairy supplier',
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    archived_at: null
  },
  {
    id: 'cust-priya-singh',
    shop_id: DEMO_SHOP.id,
    display_name: 'Priya Singh',
    normalized_name: 'priya singh',
    phone: '+91 98112 23344',
    notes: 'House No. 102',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    archived_at: null
  }
]

export const INITIAL_DEMO_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'tx-001',
    shop_id: DEMO_SHOP.id,
    customer_id: 'cust-suresh-kumar',
    type: 'CREDIT',
    amount_paise: 50000, // ₹500
    effective_date: getRelativeDateString(-2),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Atta & Sugar',
    source: 'VOICE',
    idempotency_key: 'seed-tx-001',
    status: 'POSTED'
  },
  {
    id: 'tx-002',
    shop_id: DEMO_SHOP.id,
    customer_id: 'cust-amit-verma',
    type: 'CREDIT',
    amount_paise: 120000, // ₹1,200
    effective_date: getRelativeDateString(-1),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Refined Oil and spices',
    source: 'VOICE',
    idempotency_key: 'seed-tx-002',
    status: 'POSTED'
  },
  {
    id: 'tx-003',
    shop_id: DEMO_SHOP.id,
    customer_id: 'cust-amit-verma',
    type: 'PAYMENT',
    amount_paise: 50000, // ₹500
    effective_date: getRelativeDateString(-1),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    note: 'Cash payment',
    source: 'MANUAL',
    idempotency_key: 'seed-tx-003',
    status: 'POSTED'
  },
  {
    id: 'tx-004',
    shop_id: DEMO_SHOP.id,
    customer_id: 'cust-priya-singh',
    type: 'CREDIT',
    amount_paise: 25000, // ₹250
    effective_date: getTodayDateString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    note: 'Tea & Biscuits',
    source: 'VOICE',
    idempotency_key: 'seed-tx-004',
    status: 'POSTED'
  }
]
