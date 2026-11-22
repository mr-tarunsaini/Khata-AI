import React, { createContext, useContext, useState, useEffect } from 'react'
import { Shop, UserProfile } from '@/types/ledger'
import { DEMO_SHOP } from '@/services/mock/mockData'
import { supabase, isSupabaseConfigured } from '@/services/database/supabaseClient'
import { localDb } from '@/lib/indexedDb'

interface AuthContextType {
  user: UserProfile | null
  shop: Shop | null
  isAuthenticated: boolean
  isDemoMode: boolean
  isDemoAccount: boolean
  isLoading: boolean
  login: (email: string, password?: string) => Promise<void>
  signup: (shopName: string, ownerName: string, email: string, password?: string) => Promise<void>
  logout: () => Promise<void>
  updateShopName: (name: string) => void
}

export const DUMMY_ACCOUNT = {
  email: 'sharma.kirana@demo.in',
  password: 'Password123!',
  shopName: 'Sharma Kirana Store',
  ownerName: 'Rajesh Sharma'
}

const DEMO_USER: UserProfile = {
  id: 'usr-demo-owner',
  shop_id: DEMO_SHOP.id,
  role: 'OWNER',
  full_name: 'Rajesh Sharma',
  phone: '+91 98765 00000',
  created_at: new Date().toISOString()
}

const STORAGE_SESSION_KEY = 'khata_ai_auth_session'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDemo = !isSupabaseConfigured || import.meta.env.VITE_APP_MODE === 'demo'

  // Initialize session from persisted local storage if available
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_SESSION_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          return parsed.user || null
        }
      } catch {
        // ignore parse error
      }
    }
    return null
  })

  const [shop, setShop] = useState<Shop | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_SESSION_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          return parsed.shop || null
        }
      } catch {
        // ignore parse error
      }
    }
    return null
  })

  const [isLoading, setIsLoading] = useState<boolean>(true)

  const isDemoAccount = Boolean(
    shop?.id === DEMO_SHOP.id ||
    user?.id === 'usr-demo-owner' ||
    (shop?.name === 'Sharma Kirana Store' && user?.full_name === 'Rajesh Sharma')
  )

  // Persist session changes to localStorage
  const saveSession = (nextUser: UserProfile | null, nextShop: Shop | null) => {
    setUser(nextUser)
    setShop(nextShop)
    if (nextUser && nextShop) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({ user: nextUser, shop: nextShop }))
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY)
    }
  }

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        const client = supabase
        try {
          const { data: { session } } = await client.auth.getSession()
          if (session && isMounted) {
            // Fetch associated profile and shop from Supabase
            const { data: profileData } = await client
              .from('profiles')
              .select('*, shops(*)')
              .eq('id', session.user.id)
              .maybeSingle()

            if (profileData && isMounted) {
              const u: UserProfile = {
                id: profileData.id,
                shop_id: profileData.shop_id,
                role: profileData.role,
                full_name: profileData.full_name,
                phone: profileData.phone,
                created_at: profileData.created_at
              }
              const s: Shop = profileData.shops
              saveSession(u, s)
            }
          }
        } catch (e) {
          console.warn('Supabase session check error:', e)
        } finally {
          if (isMounted) setIsLoading(false)
        }

        // Listen for live Supabase auth state changes
        const { data: authListener } = client.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            saveSession(null, null)
          } else if (event === 'SIGNED_IN' && session) {
            try {
              const { data: profileData } = await client
                .from('profiles')
                .select('*, shops(*)')
                .eq('id', session.user.id)
                .maybeSingle()

              if (profileData && isMounted) {
                const u: UserProfile = {
                  id: profileData.id,
                  shop_id: profileData.shop_id,
                  role: profileData.role,
                  full_name: profileData.full_name,
                  phone: profileData.phone,
                  created_at: profileData.created_at
                }
                const s: Shop = profileData.shops
                saveSession(u, s)
              }
            } catch (err) {
              console.warn('Error fetching profile on auth change:', err)
            }
          }
        })

        return () => {
          authListener.subscription.unsubscribe()
        }
      } else {
        if (isMounted) setIsLoading(false)
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const isDummyCredentials = (emailInput: string): boolean => {
    const normalized = emailInput.trim().toLowerCase()
    return (
      normalized === DUMMY_ACCOUNT.email.toLowerCase() ||
      normalized === 'sharma@khataai.com' ||
      normalized === 'demo@khataai.com' ||
      normalized === 'test@khataai.com'
    )
  }

  const login = async (email: string, password?: string) => {
    setIsLoading(true)
    const normalizedEmail = email.trim().toLowerCase()

    try {
      // 1. Check if user is logging into the pre-populated Dummy Test Account
      if (isDummyCredentials(normalizedEmail)) {
        if (isSupabaseConfigured && supabase && password) {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
          })

          if (!authError && authData.user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*, shops(*)')
              .eq('id', authData.user.id)
              .maybeSingle()

            if (profileData) {
              const u: UserProfile = {
                id: profileData.id,
                shop_id: profileData.shop_id,
                role: profileData.role,
                full_name: profileData.full_name,
                phone: profileData.phone,
                created_at: profileData.created_at
              }
              saveSession(u, profileData.shops)
              await localDb.initializeDemoDataIfEmpty()
              return
            }
          }
        }

        // Seamless fallback for Dummy Test Account with rich seeded data
        await localDb.initializeDemoDataIfEmpty()
        saveSession(DEMO_USER, DEMO_SHOP)
        return
      }

      // 2. Real User Login via Supabase Auth
      if (isSupabaseConfigured && supabase) {
        if (!password) {
          throw new Error('कृपया पासवर्ड दर्ज करें (Password is required)')
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password
        })

        if (authError) {
          if (authError.message.includes('Invalid login credentials')) {
            throw new Error('ईमेल या पासवर्ड गलत है। यदि नया खाता है तो "साइन अप" चुनें।')
          }
          if (authError.message.includes('Email not confirmed')) {
            throw new Error('ईमेल अभी सत्यापित नहीं हुआ है। कृपया ईमेल इनबॉक्स चेक करें या टेस्ट खाता प्रयोग करें।')
          }
          throw new Error(authError.message)
        }

        if (authData.user) {
          // Fetch linked shop and profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*, shops(*)')
            .eq('id', authData.user.id)
            .maybeSingle()

          if (profileData) {
            const u: UserProfile = {
              id: profileData.id,
              shop_id: profileData.shop_id,
              role: profileData.role,
              full_name: profileData.full_name,
              phone: profileData.phone,
              created_at: profileData.created_at
            }
            saveSession(u, profileData.shops)
          } else {
            // Fallback profile if profile row was not yet created
            const newShop: Shop = {
              id: `shop-${authData.user.id.slice(0, 8)}`,
              name: authData.user.user_metadata?.shop_name || 'My Kirana Store',
              owner_name: authData.user.user_metadata?.owner_name || email.split('@')[0],
              timezone: 'Asia/Kolkata',
              default_language: 'hi',
              created_at: new Date().toISOString()
            }
            const newUser: UserProfile = {
              id: authData.user.id,
              shop_id: newShop.id,
              role: 'OWNER',
              full_name: authData.user.user_metadata?.owner_name || email.split('@')[0],
              created_at: new Date().toISOString()
            }
            saveSession(newUser, newShop)
          }
        }
      } else {
        // Offline / Local user login
        const offlineShop: Shop = {
          id: `shop-${Date.now()}`,
          name: `${email.split('@')[0]} Kirana Store`,
          owner_name: email.split('@')[0] || 'Shopkeeper',
          timezone: 'Asia/Kolkata',
          default_language: 'hi',
          created_at: new Date().toISOString()
        }
        const offlineUser: UserProfile = {
          id: `usr-${Date.now()}`,
          shop_id: offlineShop.id,
          role: 'OWNER',
          full_name: email.split('@')[0] || 'Shopkeeper',
          created_at: new Date().toISOString()
        }
        saveSession(offlineUser, offlineShop)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (shopName: string, ownerName: string, email: string, password?: string) => {
    setIsLoading(true)
    const normalizedEmail = email.trim().toLowerCase()

    try {
      // Clear any old local demo data so new user starts completely empty
      await localDb.clear('customers').catch(() => {})
      await localDb.clear('transactions').catch(() => {})

      if (isSupabaseConfigured && supabase && password) {
        // 1. Supabase Auth signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              shop_name: shopName.trim(),
              owner_name: ownerName.trim()
            }
          }
        })

        if (authError) {
          if (authError.message.includes('rate limit')) {
            console.warn('Supabase email rate limit encountered. Activating store locally.')
            const localShop: Shop = {
              id: `shop-${Date.now()}`,
              name: shopName.trim(),
              owner_name: ownerName.trim(),
              timezone: 'Asia/Kolkata',
              default_language: 'hi',
              created_at: new Date().toISOString()
            }
            const localUser: UserProfile = {
              id: `usr-${Date.now()}`,
              shop_id: localShop.id,
              role: 'OWNER',
              full_name: ownerName.trim(),
              created_at: new Date().toISOString()
            }
            saveSession(localUser, localShop)
            return
          }
          throw new Error(authError.message)
        }

        if (authData.user) {
          const userId = authData.user.id

          // Check if auto-provisioning trigger created the profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*, shops(*)')
            .eq('id', userId)
            .maybeSingle()

          if (existingProfile) {
            const u: UserProfile = {
              id: existingProfile.id,
              shop_id: existingProfile.shop_id,
              role: existingProfile.role,
              full_name: existingProfile.full_name,
              phone: existingProfile.phone,
              created_at: existingProfile.created_at
            }
            saveSession(u, existingProfile.shops)
            return
          }

          // If trigger did not create it, insert shop & profile directly
          let shopRecord: Shop | null = null
          try {
            const { data: createdShop } = await supabase
              .from('shops')
              .insert({
                name: shopName.trim(),
                owner_name: ownerName.trim(),
                default_language: 'hi',
                timezone: 'Asia/Kolkata'
              })
              .select()
              .single()

            shopRecord = createdShop
          } catch (shopInsertErr) {
            console.warn('Shop insertion via client RLS:', shopInsertErr)
          }

          const resolvedShop: Shop = shopRecord || {
            id: `shop-${userId.slice(0, 8)}`,
            name: shopName.trim(),
            owner_name: ownerName.trim(),
            timezone: 'Asia/Kolkata',
            default_language: 'hi',
            created_at: new Date().toISOString()
          }

          try {
            await supabase.from('profiles').insert({
              id: userId,
              shop_id: resolvedShop.id,
              role: 'OWNER',
              full_name: ownerName.trim()
            })
          } catch (profileInsertErr) {
            console.warn('Profile insertion via client RLS:', profileInsertErr)
          }

          const newUser: UserProfile = {
            id: userId,
            shop_id: resolvedShop.id,
            role: 'OWNER',
            full_name: ownerName.trim(),
            created_at: new Date().toISOString()
          }

          saveSession(newUser, resolvedShop)
        }
      } else {
        // Offline / Local Mode signup
        const newShop: Shop = {
          id: `shop-${Date.now()}`,
          name: shopName.trim() || 'My Kirana Store',
          owner_name: ownerName.trim() || 'Shopkeeper',
          timezone: 'Asia/Kolkata',
          default_language: 'hi',
          created_at: new Date().toISOString()
        }
        const newUser: UserProfile = {
          id: `usr-${Date.now()}`,
          shop_id: newShop.id,
          role: 'OWNER',
          full_name: ownerName.trim() || 'Shopkeeper',
          created_at: new Date().toISOString()
        }
        saveSession(newUser, newShop)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut().catch(() => {})
      }
    } finally {
      saveSession(null, null)
      setIsLoading(false)
    }
  }

  const updateShopName = (name: string) => {
    if (shop) {
      const updated = { ...shop, name }
      saveSession(user, updated)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        shop,
        isAuthenticated: !!user && !!shop,
        isDemoMode: isDemo,
        isDemoAccount,
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
