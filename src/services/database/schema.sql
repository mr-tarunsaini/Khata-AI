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
-- GRANT SCHEMA AND TABLE PERMISSIONS TO POSTGREST ROLES
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

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

-- 1. Shops RLS: Authenticated users can create a shop and view/update their own shop
DROP POLICY IF EXISTS shop_member_select ON public.shops;
CREATE POLICY shop_member_select ON public.shops
  FOR SELECT TO authenticated USING (id = public.get_auth_shop_id() OR id IN (SELECT shop_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS shop_member_insert ON public.shops;
CREATE POLICY shop_member_insert ON public.shops
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS shop_member_update ON public.shops;
CREATE POLICY shop_member_update ON public.shops
  FOR UPDATE TO authenticated USING (id = public.get_auth_shop_id());

-- 2. Profiles RLS: Users can view profiles in their own shop and create/update their own profile
DROP POLICY IF EXISTS profile_shop_select ON public.profiles;
CREATE POLICY profile_shop_select ON public.profiles
  FOR SELECT TO authenticated USING (shop_id = public.get_auth_shop_id() OR id = auth.uid());

DROP POLICY IF EXISTS profile_user_insert ON public.profiles;
CREATE POLICY profile_user_insert ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profile_user_update ON public.profiles;
CREATE POLICY profile_user_update ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- 3. Customers RLS: Shop-scoped read, write, update, delete
DROP POLICY IF EXISTS customer_shop_select ON public.customers;
CREATE POLICY customer_shop_select ON public.customers
  FOR SELECT TO authenticated USING (shop_id = public.get_auth_shop_id());

DROP POLICY IF EXISTS customer_shop_insert ON public.customers;
CREATE POLICY customer_shop_insert ON public.customers
  FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_auth_shop_id());

DROP POLICY IF EXISTS customer_shop_update ON public.customers;
CREATE POLICY customer_shop_update ON public.customers
  FOR UPDATE TO authenticated USING (shop_id = public.get_auth_shop_id());

DROP POLICY IF EXISTS customer_shop_delete ON public.customers;
CREATE POLICY customer_shop_delete ON public.customers
  FOR DELETE TO authenticated USING (shop_id = public.get_auth_shop_id());

-- 4. Ledger Transactions RLS: Strictly shop-scoped append-only
DROP POLICY IF EXISTS ledger_shop_select ON public.ledger_transactions;
CREATE POLICY ledger_shop_select ON public.ledger_transactions
  FOR SELECT TO authenticated USING (shop_id = public.get_auth_shop_id());

DROP POLICY IF EXISTS ledger_shop_insert ON public.ledger_transactions;
CREATE POLICY ledger_shop_insert ON public.ledger_transactions
  FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_auth_shop_id());

DROP POLICY IF EXISTS ledger_shop_update ON public.ledger_transactions;
CREATE POLICY ledger_shop_update ON public.ledger_transactions
  FOR UPDATE TO authenticated USING (shop_id = public.get_auth_shop_id());

-- 5. Audit Events RLS: Shop-scoped read and insert
DROP POLICY IF EXISTS audit_shop_select ON public.audit_events;
CREATE POLICY audit_shop_select ON public.audit_events
  FOR SELECT TO authenticated USING (shop_id = public.get_auth_shop_id());

DROP POLICY IF EXISTS audit_shop_insert ON public.audit_events;
CREATE POLICY audit_shop_insert ON public.audit_events
  FOR INSERT TO authenticated WITH CHECK (shop_id = public.get_auth_shop_id());

-- 6. Pending Voice Sessions RLS
DROP POLICY IF EXISTS pending_session_select ON public.pending_voice_sessions;
DROP POLICY IF EXISTS pending_session_all ON public.pending_voice_sessions;
CREATE POLICY pending_session_all ON public.pending_voice_sessions
  FOR ALL TO authenticated USING (shop_id = public.get_auth_shop_id());

-- =============================================================================
-- AUTO-PROVISIONING TRIGGER: Automatically set up shop and profile on signup
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_shop_id UUID;
  shop_name_input TEXT;
  owner_name_input TEXT;
BEGIN
  shop_name_input := COALESCE(new.raw_user_meta_data->>'shop_name', 'Sharma Kirana Store');
  owner_name_input := COALESCE(new.raw_user_meta_data->>'owner_name', split_part(new.email, '@', 1));

  -- Create default shop for new user
  INSERT INTO public.shops (name, owner_name, default_language)
  VALUES (shop_name_input, owner_name_input, 'hi')
  RETURNING id INTO new_shop_id;

  -- Create profile linked to auth user and shop
  INSERT INTO public.profiles (id, shop_id, role, full_name)
  VALUES (new.id, new_shop_id, 'OWNER', owner_name_input)
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- SEED DATA (For initial demonstration)
-- =============================================================================
INSERT INTO public.shops (id, name, owner_name, timezone, default_language)
VALUES ('00000000-0000-0000-0000-000000000001', 'Sharma Kirana Store', 'Rajesh Sharma', 'Asia/Kolkata', 'hi')
ON CONFLICT (id) DO NOTHING;
