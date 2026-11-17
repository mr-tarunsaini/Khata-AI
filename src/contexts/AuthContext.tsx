import React, { createContext, useContext, useState, useEffect } from 'react'
import { Shop, UserProfile } from '@/types/ledger'
import { DEMO_SHOP } from '@/services/mock/mockData'
import { supabase, isSupabaseConfigured } from '@/services/database/supabaseClient'

interface AuthContextType {
  user: UserProfile | null
  shop: Shop | null
  isAuthenticated: boolean
  isDemoMode: boolean
  isLoading: boolean
  login: (email: string, password?: string) => Promise<void>
  signup: (shopName: string, ownerName: string, email: string, password?: string) => Promise<void>
  logout: () => Promise<void>
  updateShopName: (name: string) => void
}

const DEMO_USER: UserProfile = {
  id: 'usr-demo-owner',
  shop_id: DEMO_SHOP.id,
  role: 'OWNER',
  full_name: 'Rajesh Sharma',
  phone: '+91 98765 00000',
  created_at: new Date().toISOString()
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDemo = !isSupabaseConfigured || import.meta.env.VITE_APP_MODE === 'demo'
  const [shop, setShop] = useState<Shop | null>(DEMO_SHOP)
  const [user, setUser] = useState<UserProfile | null>(DEMO_USER)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const client = supabase
      setIsLoading(true)

      const checkSession = async () => {
        try {
          const { data: { session } } = await client.auth.getSession()
          if (session) {
            const { data } = await client
              .from('profiles')
              .select('*, shops(*)')
              .eq('id', session.user.id)
              .single()

            if (data) {
              setUser({
                id: data.id,
                shop_id: data.shop_id,
                role: data.role,
                full_name: data.full_name,
                phone: data.phone,
                created_at: data.created_at
              })
              setShop(data.shops)
            }
          }
        } catch {
          // Fallback to local session
        } finally {
          setIsLoading(false)
        }
      }

      checkSession()

      const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setShop(null)
        } else if (session) {
          try {
            const { data } = await client
              .from('profiles')
              .select('*, shops(*)')
              .eq('id', session.user.id)
              .single()
            if (data) {
              setUser({
                id: data.id,
                shop_id: data.shop_id,
                role: data.role,
                full_name: data.full_name,
                phone: data.phone,
                created_at: data.created_at
              })
              setShop(data.shops)
            }
          } catch {
            // ignore
          }
        }
      })

      return () => {
        authListener.subscription.unsubscribe()
      }
    } else {
      // Local Demo Mode: restore custom shop name if saved
      const savedShop = localStorage.getItem('khata_ai_shop')
      if (savedShop) {
        try {
          setShop(JSON.parse(savedShop))
        } catch {
          // ignore
        }
      }
    }
  }, [isDemo])

  const login = async (email: string, password?: string) => {
    setIsLoading(true)
    if (isSupabaseConfigured && supabase && password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } else {
      // Demo Mode login
      setUser({
        ...DEMO_USER,
        full_name: email.split('@')[0] || 'Rajesh Sharma'
      })
      setShop(DEMO_SHOP)
    }
    setIsLoading(false)
  }

  const signup = async (shopName: string, ownerName: string, email: string, password?: string) => {
    setIsLoading(true)
    if (isSupabaseConfigured && supabase && password) {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError

      if (authData.user) {
        // Create shop & profile
        const { data: shopData } = await supabase
          .from('shops')
          .insert({ name: shopName, owner_name: ownerName, default_language: 'hi' })
          .select()
          .single()

        if (shopData) {
          await supabase.from('profiles').insert({
            id: authData.user.id,
            shop_id: shopData.id,
            role: 'OWNER',
            full_name: ownerName
          })
          setShop(shopData)
        }
      }
    } else {
      // Demo Mode signup
      const newShop: Shop = {
        id: `shop-${Date.now()}`,
        name: shopName || 'My Kirana Store',
        owner_name: ownerName || 'Shopkeeper',
        timezone: 'Asia/Kolkata',
        default_language: 'hi',
        created_at: new Date().toISOString()
      }
      setShop(newShop)
      setUser({
        id: `usr-${Date.now()}`,
        shop_id: newShop.id,
        role: 'OWNER',
        full_name: ownerName,
        created_at: new Date().toISOString()
      })
      localStorage.setItem('khata_ai_shop', JSON.stringify(newShop))
    }
    setIsLoading(false)
  }

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setShop(null)
  }

  const updateShopName = (name: string) => {
    if (shop) {
      const updated = { ...shop, name }
      setShop(updated)
      localStorage.setItem('khata_ai_shop', JSON.stringify(updated))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        shop,
        isAuthenticated: !!user && !!shop,
        isDemoMode: isDemo,
        isLoading,
        login,
        signup,
        logout,
        updateShopName
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
