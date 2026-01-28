-- Fix linter warnings: update functions with search_path

-- Drop and recreate update_admin_config_timestamp with proper search_path
DROP TRIGGER IF EXISTS update_admin_plans_timestamp ON public.admin_subscription_plans;
DROP TRIGGER IF EXISTS update_admin_offers_timestamp ON public.admin_offers;
DROP TRIGGER IF EXISTS update_admin_limits_timestamp ON public.admin_usage_limits;
DROP TRIGGER IF EXISTS update_admin_flags_timestamp ON public.admin_feature_flags;
DROP TRIGGER IF EXISTS update_admin_overrides_timestamp ON public.admin_user_overrides;

CREATE OR REPLACE FUNCTION public.update_admin_config_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
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