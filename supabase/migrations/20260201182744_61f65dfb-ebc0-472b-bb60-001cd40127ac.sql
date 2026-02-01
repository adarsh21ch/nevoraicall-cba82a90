-- ============================================
-- Create user_products table for product-scoped authentication
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT user_products_user_product_unique UNIQUE(user_id, product),
  CONSTRAINT user_products_product_check CHECK (product IN ('nevorai', 'achievers_club'))
);

-- Enable RLS
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

-- Users can only view their own product access
CREATE POLICY "Users can view their own product access"
ON public.user_products
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can do everything (edge functions use service role)
CREATE POLICY "Service role has full access"
ON public.user_products
FOR ALL
USING (auth.role() = 'service_role');

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON public.user_products(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_product ON public.user_products(product);

-- ============================================
-- Migrate existing users to user_products table
-- ============================================

-- Grant Nevorai access to all existing Nevorai users (those without AC source)
INSERT INTO public.user_products (user_id, product)
SELECT user_id, 'nevorai' FROM public.profiles
WHERE source_app IS NULL 
   OR source_app = ''
   OR source_app NOT IN ('achievers_club', 'achievers_club_linked')
ON CONFLICT (user_id, product) DO NOTHING;

-- Grant Achievers Club access to AC users
INSERT INTO public.user_products (user_id, product)
SELECT user_id, 'achievers_club' FROM public.profiles
WHERE source_app IN ('achievers_club', 'achievers_club_linked')
ON CONFLICT (user_id, product) DO NOTHING;

-- Also grant Nevorai access to AC-linked users (they explicitly signed up for Nevorai)
INSERT INTO public.user_products (user_id, product)
SELECT user_id, 'nevorai' FROM public.profiles
WHERE source_app = 'achievers_club_linked'
ON CONFLICT (user_id, product) DO NOTHING;

-- ============================================
-- Helper function to check product access
-- ============================================

CREATE OR REPLACE FUNCTION public.has_product_access(p_user_id uuid, p_product text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_products
    WHERE user_id = p_user_id AND product = p_product
  );
$$;

-- ============================================
-- Helper function to grant product access
-- ============================================

CREATE OR REPLACE FUNCTION public.grant_product_access(p_user_id uuid, p_product text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_products (user_id, product)
  VALUES (p_user_id, p_product)
  ON CONFLICT (user_id, product) DO NOTHING;
  RETURN TRUE;
END;
$$;