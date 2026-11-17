-- =============================================================================
-- KhataAI — Production Supabase PostgreSQL Schema & Security Policies
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SHOPS TABLE
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_name TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  default_language TEXT NOT NULL DEFAULT 'hi' CHECK (default_language IN ('hi', 'hi-en', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PROFILES TABLE (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'OWNER' CHECK (role IN ('OWNER', 'STAFF')),
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  phone_encrypted TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- 4. LEDGER_TRANSACTIONS TABLE (Append-Only Deterministic Ledger)
CREATE TABLE IF NOT EXISTS public.ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('CREDIT', 'PAYMENT', 'REVERSAL', 'ADJUSTMENT')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  source TEXT NOT NULL CHECK (source IN ('VOICE', 'MANUAL', 'CORRECTION')),
  idempotency_key TEXT NOT NULL,
  reverses_transaction_id UUID REFERENCES public.ledger_transactions(id),
  created_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'VOIDED', 'PENDING_SYNC')),
  transcript_ref TEXT,
  CONSTRAINT uq_shop_idempotency UNIQUE (shop_id, idempotency_key)
);

-- 5. AUDIT_EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  actor_id UUID,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('CUSTOMER', 'TRANSACTION', 'SHOP', 'AUTH')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'REVERSE', 'ARCHIVE', 'LOGIN', 'SYNC')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PENDING_VOICE_SESSIONS TABLE (Ephemeral disambiguation & correction state)
CREATE TABLE IF NOT EXISTS public.pending_voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id UUID,
  state JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_shop_normalized ON public.customers(shop_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_customers_shop_active ON public.customers(shop_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_shop_customer ON public.ledger_transactions(shop_id, customer_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_ledger_shop_date ON public.ledger_transactions(shop_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_ledger_idempotency ON public.ledger_transactions(shop_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_audit_shop ON public.audit_events(shop_id, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_voice_sessions ENABLE ROW LEVEL SECURITY;

-- Security helper function to get current user's shop_id
CREATE OR REPLACE FUNCTION public.get_auth_shop_id()
RETURNS UUID AS $$
  SELECT shop_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. Shops RLS: Members can view their own shop
CREATE POLICY shop_member_select ON public.shops
  FOR SELECT USING (id = public.get_auth_shop_id());

-- 2. Profiles RLS: Users can view profiles in their own shop
CREATE POLICY profile_shop_select ON public.profiles
  FOR SELECT USING (shop_id = public.get_auth_shop_id());

CREATE POLICY profile_user_update ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- 3. Customers RLS: Shop-scoped read and write
CREATE POLICY customer_shop_select ON public.customers
  FOR SELECT USING (shop_id = public.get_auth_shop_id());

CREATE POLICY customer_shop_insert ON public.customers
  FOR INSERT WITH CHECK (shop_id = public.get_auth_shop_id());

CREATE POLICY customer_shop_update ON public.customers
  FOR UPDATE USING (shop_id = public.get_auth_shop_id());

-- 4. Ledger Transactions RLS: Strictly shop-scoped append-only
CREATE POLICY ledger_shop_select ON public.ledger_transactions
  FOR SELECT USING (shop_id = public.get_auth_shop_id());

CREATE POLICY ledger_shop_insert ON public.ledger_transactions
  FOR INSERT WITH CHECK (shop_id = public.get_auth_shop_id());

-- Reversals / Corrections can update status if permitted
CREATE POLICY ledger_shop_update ON public.ledger_transactions
  FOR UPDATE USING (shop_id = public.get_auth_shop_id());

-- 5. Audit Events RLS: Shop-scoped read and insert
CREATE POLICY audit_shop_select ON public.audit_events
  FOR SELECT USING (shop_id = public.get_auth_shop_id());

CREATE POLICY audit_shop_insert ON public.audit_events
  FOR INSERT WITH CHECK (shop_id = public.get_auth_shop_id());

-- 6. Pending Voice Sessions RLS
CREATE POLICY pending_session_select ON public.pending_voice_sessions
  FOR SELECT USING (shop_id = public.get_auth_shop_id());

CREATE POLICY pending_session_all ON public.pending_voice_sessions
  FOR ALL USING (shop_id = public.get_auth_shop_id());

-- =============================================================================
-- SEED DATA (For initial demonstration)
-- =============================================================================
-- Synthetic Kirana Shop
INSERT INTO public.shops (id, name, owner_name, timezone, default_language)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sharma Kirana Store', 'Rajesh Sharma', 'Asia/Kolkata', 'hi')
ON CONFLICT (id) DO NOTHING;
