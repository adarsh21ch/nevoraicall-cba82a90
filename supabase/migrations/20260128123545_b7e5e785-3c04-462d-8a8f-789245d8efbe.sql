-- =============================================
-- ADMIN CONFIGURATION TABLES
-- =============================================

-- 1. Subscription Plans Table
CREATE TABLE public.admin_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT UNIQUE NOT NULL,
  plan_name TEXT NOT NULL,
  description TEXT,
  price_inr INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  payment_link TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  badge_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Offers Table
CREATE TABLE public.admin_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_name TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'flat')),
  discount_value INTEGER NOT NULL,
  applicable_plan_ids UUID[] DEFAULT '{}',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses_per_user INTEGER,
  promo_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Usage Limits Table
CREATE TABLE public.admin_usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value INTEGER NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 4. Feature Flags Table
CREATE TABLE public.admin_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  free_access BOOLEAN DEFAULT false,
  pro_access BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. User Overrides Table
CREATE TABLE public.admin_user_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  force_pro_access BOOLEAN DEFAULT false,
  custom_daily_limit INTEGER,
  custom_total_limit INTEGER,
  custom_expiry_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.admin_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_overrides ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - READ ACCESS FOR ALL AUTHENTICATED
-- =============================================

CREATE POLICY "Anyone can read subscription plans"
  ON public.admin_subscription_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read offers"
  ON public.admin_offers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read usage limits"
  ON public.admin_usage_limits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read feature flags"
  ON public.admin_feature_flags FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- RLS POLICIES - ADMIN WRITE ACCESS
-- =============================================

CREATE POLICY "Admins can manage subscription plans"
  ON public.admin_subscription_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage offers"
  ON public.admin_offers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage usage limits"
  ON public.admin_usage_limits FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage feature flags"
  ON public.admin_feature_flags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user overrides"
  ON public.admin_user_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SEED DEFAULT DATA
-- =============================================

-- Default Subscription Plans
INSERT INTO public.admin_subscription_plans (plan_key, plan_name, description, price_inr, duration_days, payment_link, features, is_active, is_default, sort_order, badge_text)
VALUES 
  ('quarterly', 'Pro 4-Month', '4 Months Access – Best Value', 299, 120, 'https://rzp.io/rzp/CPQRHdp', 
   '["Unlimited prospects", "Auto-sync from teammates", "View team member tracking", "Team actions & dashboards", "Switch tracking source", "Frontline team gets access FREE"]'::jsonb,
   true, true, 1, 'Best Value'),
  ('monthly', 'Pro Monthly', '1 Month Access', 99, 30, 'https://rzp.io/rzp/HhAdokE',
   '["Unlimited prospects", "Manual personal tracking", "Manual team tracking (self-entered)", "Auto-calculated totals"]'::jsonb,
   true, false, 2, NULL);

-- Default Usage Limits
INSERT INTO public.admin_usage_limits (config_key, config_value, description, is_enabled)
VALUES 
  ('free_total_leads', 1000, 'Maximum total leads a free user can add (lifetime)', true),
  ('free_daily_upload', 100, 'Maximum leads a free user can upload per day', true),
  ('pro_daily_upload', 500, 'Maximum leads a pro user can upload per day (0 = unlimited)', true),
  ('warning_threshold_1', 800, 'First warning threshold for upgrade nudge (Stage 1)', true),
  ('warning_threshold_2', 900, 'Second warning threshold for upgrade nudge (Stage 2)', true),
  ('warning_threshold_3', 950, 'Third warning threshold for upgrade nudge (Stage 3 - sticky)', true),
  ('hard_limit', 1000, 'Hard limit where blocking modal appears (Stage 4)', true);

-- Default Feature Flags
INSERT INTO public.admin_feature_flags (feature_key, feature_name, description, free_access, pro_access, is_enabled)
VALUES 
  ('insights', 'View Insights', 'Access to tracking insights and analytics', true, true, true),
  ('export', 'Export Data', 'Export prospects to Excel', true, true, true),
  ('ai_tips', 'AI Tips', 'AI-powered conversion tips', true, true, true),
  ('team_sync', 'Team Sync', 'Auto-sync data from teammates', false, true, true),
  ('team_view', 'Team View', 'View team member tracking data', false, true, true),
  ('funnel_analytics', 'Funnel Analytics', 'Advanced funnel analytics', true, true, true);

-- =============================================
-- DATABASE FUNCTION: Get App Config
-- =============================================

CREATE OR REPLACE FUNCTION public.get_app_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'plans', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'plan_key', plan_key,
          'plan_name', plan_name,
          'description', description,
          'price_inr', price_inr,
          'duration_days', duration_days,
          'payment_link', payment_link,
          'features', features,
          'is_active', is_active,
          'is_default', is_default,
          'sort_order', sort_order,
          'badge_text', badge_text
        ) ORDER BY sort_order
      )
      FROM admin_subscription_plans
      WHERE is_active = true
    ), '[]'::jsonb),
    'offers', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'offer_name', offer_name,
          'discount_type', discount_type,
          'discount_value', discount_value,
          'applicable_plan_ids', applicable_plan_ids,
          'start_date', start_date,
          'end_date', end_date,
          'is_active', is_active,
          'max_uses_per_user', max_uses_per_user,
          'promo_code', promo_code
        )
      )
      FROM admin_offers
      WHERE is_active = true 
        AND start_date <= now() 
        AND end_date >= now()
    ), '[]'::jsonb),
    'limits', COALESCE((
      SELECT jsonb_object_agg(config_key, config_value)
      FROM admin_usage_limits
      WHERE is_enabled = true
    ), '{}'::jsonb),
    'features', COALESCE((
      SELECT jsonb_object_agg(
        feature_key, 
        jsonb_build_object(
          'feature_name', feature_name,
          'description', description,
          'free_access', free_access,
          'pro_access', pro_access,
          'is_enabled', is_enabled
        )
      )
      FROM admin_feature_flags
    ), '{}'::jsonb)
  );
END;
$$;

-- =============================================
-- DATABASE FUNCTION: Get User Effective Limits
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_effective_limits(p_user_id uuid)
RETURNS TABLE(
  total_limit integer,
  daily_limit integer,
  is_override boolean,
  force_pro boolean,
  custom_expiry date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override RECORD;
  v_base_total integer;
  v_base_daily integer;
BEGIN
  -- Check for user-specific overrides
  SELECT * INTO v_override 
  FROM admin_user_overrides 
  WHERE admin_user_overrides.user_id = p_user_id;
  
  -- Get base limits from config
  SELECT config_value INTO v_base_total 
  FROM admin_usage_limits 
  WHERE config_key = 'free_total_leads' AND is_enabled = true;
  
  SELECT config_value INTO v_base_daily 
  FROM admin_usage_limits 
  WHERE config_key = 'free_daily_upload' AND is_enabled = true;
  
  -- Return with overrides applied
  RETURN QUERY SELECT
    COALESCE(v_override.custom_total_limit, v_base_total, 1000) as total_limit,
    COALESCE(v_override.custom_daily_limit, v_base_daily, 100) as daily_limit,
    v_override.id IS NOT NULL as is_override,
    COALESCE(v_override.force_pro_access, false) as force_pro,
    v_override.custom_expiry_date as custom_expiry;
END;
$$;

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_admin_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_plans_timestamp
  BEFORE UPDATE ON public.admin_subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_admin_config_timestamp();

CREATE TRIGGER update_admin_offers_timestamp
  BEFORE UPDATE ON public.admin_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_admin_config_timestamp();

CREATE TRIGGER update_admin_limits_timestamp
  BEFORE UPDATE ON public.admin_usage_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_admin_config_timestamp();

CREATE TRIGGER update_admin_flags_timestamp
  BEFORE UPDATE ON public.admin_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_admin_config_timestamp();

CREATE TRIGGER update_admin_overrides_timestamp
  BEFORE UPDATE ON public.admin_user_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_admin_config_timestamp();