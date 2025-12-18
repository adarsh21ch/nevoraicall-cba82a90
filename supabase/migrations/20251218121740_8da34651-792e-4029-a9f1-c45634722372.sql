-- 1. Add email column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Create trigger to sync email from auth.users
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET email = NEW.email 
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();

-- 3. Backfill existing emails
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- 4. Admin function to list all profiles (using actual schema columns)
CREATE OR REPLACE FUNCTION public.admin_list_all_profiles()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  phone text,
  neverai_id text,
  subscription_plan text,
  subscription_status text,
  subscription_expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.email,
    p.phone,
    p.neverai_id,
    s.plan::text,
    s.status,
    s.expires_at,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_subscriptions s ON s.user_id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- 5. Admin function to get stats (using actual tables)
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS TABLE (
  total_users bigint,
  active_pro_users bigint,
  total_payments bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.user_subscriptions WHERE plan = 'pro' AND status = 'active'),
    (SELECT COUNT(*) FROM public.payments_log WHERE status = 'success');
END;
$$;