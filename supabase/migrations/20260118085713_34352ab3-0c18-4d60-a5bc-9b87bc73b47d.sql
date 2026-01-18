
-- Enhanced Admin Analytics Functions

-- 1. Get detailed revenue statistics
CREATE OR REPLACE FUNCTION public.admin_get_revenue_stats()
RETURNS TABLE(
  total_revenue bigint,
  this_month_revenue bigint,
  last_month_revenue bigint,
  total_payments bigint,
  successful_payments bigint,
  failed_payments bigint,
  mini_plan_revenue bigint,
  pro_plan_revenue bigint,
  mini_plan_count bigint,
  pro_plan_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END), 0)::bigint as total_revenue,
    COALESCE(SUM(CASE WHEN status = 'success' AND created_at >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0)::bigint as this_month_revenue,
    COALESCE(SUM(CASE WHEN status = 'success' AND created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND created_at < date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0)::bigint as last_month_revenue,
    COUNT(*)::bigint as total_payments,
    COUNT(CASE WHEN status = 'success' THEN 1 END)::bigint as successful_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END)::bigint as failed_payments,
    COALESCE(SUM(CASE WHEN status = 'success' AND amount = 9900 THEN amount ELSE 0 END), 0)::bigint as mini_plan_revenue,
    COALESCE(SUM(CASE WHEN status = 'success' AND amount = 29900 THEN amount ELSE 0 END), 0)::bigint as pro_plan_revenue,
    COUNT(CASE WHEN status = 'success' AND amount = 9900 THEN 1 END)::bigint as mini_plan_count,
    COUNT(CASE WHEN status = 'success' AND amount = 29900 THEN 1 END)::bigint as pro_plan_count
  FROM payments_log;
END;
$$;

-- 2. Get pro users with detailed info
CREATE OR REPLACE FUNCTION public.admin_get_pro_users()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email text,
  neverai_id text,
  plan text,
  subscribed_at timestamptz,
  expires_at timestamptz,
  is_admin_override boolean,
  is_expired boolean,
  days_remaining integer,
  payment_amount bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    us.user_id,
    p.display_name,
    COALESCE(p.email, au.email) as email,
    p.neverai_id,
    us.plan::text,
    us.subscribed_at,
    us.expires_at,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    (us.expires_at IS NOT NULL AND us.expires_at < NOW()) as is_expired,
    CASE 
      WHEN us.expires_at IS NULL THEN NULL
      WHEN us.expires_at < NOW() THEN 0
      ELSE EXTRACT(DAY FROM us.expires_at - NOW())::integer
    END as days_remaining,
    (SELECT pl.amount FROM payments_log pl WHERE pl.user_id = us.user_id AND pl.status = 'success' ORDER BY pl.created_at DESC LIMIT 1) as payment_amount
  FROM user_subscriptions us
  JOIN profiles p ON p.user_id = us.user_id
  LEFT JOIN auth.users au ON au.id = us.user_id
  WHERE us.plan = 'pro' OR us.plan = 'mini'
  ORDER BY us.subscribed_at DESC;
END;
$$;

-- 3. Get free users
CREATE OR REPLACE FUNCTION public.admin_get_free_users()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email text,
  neverai_id text,
  leads_count bigint,
  last_active timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    COALESCE(p.email, au.email) as email,
    p.neverai_id,
    (SELECT COUNT(*) FROM prospects pr WHERE pr.user_id = p.user_id)::bigint as leads_count,
    (SELECT MAX(last_seen_at) FROM user_app_access ua WHERE ua.user_id = p.user_id) as last_active,
    p.created_at
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  WHERE us.user_id IS NULL OR us.plan = 'free'
  ORDER BY p.created_at DESC;
END;
$$;

-- 4. Get active users (who added leads or updated prospects today/this week)
CREATE OR REPLACE FUNCTION public.admin_get_active_usage_stats()
RETURNS TABLE(
  leads_importers_today bigint,
  leads_importers_week bigint,
  active_callers_today bigint,
  active_callers_week bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT user_id) FROM prospects WHERE date_added::date = CURRENT_DATE)::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM prospects WHERE date_added >= CURRENT_DATE - INTERVAL '7 days')::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM prospects WHERE updated_at::date = CURRENT_DATE AND updated_at != date_added)::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM prospects WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days' AND updated_at != date_added)::bigint;
END;
$$;

-- 5. Get expiring subscriptions
CREATE OR REPLACE FUNCTION public.admin_get_expiring_subscriptions(days_ahead integer DEFAULT 7)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email text,
  neverai_id text,
  plan text,
  expires_at timestamptz,
  days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    us.user_id,
    p.display_name,
    COALESCE(p.email, au.email) as email,
    p.neverai_id,
    us.plan::text,
    us.expires_at,
    EXTRACT(DAY FROM us.expires_at - NOW())::integer as days_remaining
  FROM user_subscriptions us
  JOIN profiles p ON p.user_id = us.user_id
  LEFT JOIN auth.users au ON au.id = us.user_id
  WHERE us.plan IN ('pro', 'mini')
    AND us.expires_at IS NOT NULL
    AND us.expires_at > NOW()
    AND us.expires_at <= NOW() + (days_ahead || ' days')::interval
  ORDER BY us.expires_at ASC;
END;
$$;

-- 6. Get daily revenue trend for charts
CREATE OR REPLACE FUNCTION public.admin_get_revenue_trend(days_back integer DEFAULT 30)
RETURNS TABLE(
  date date,
  revenue bigint,
  payment_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    d.date::date,
    COALESCE(SUM(pl.amount), 0)::bigint as revenue,
    COUNT(pl.id)::bigint as payment_count
  FROM generate_series(
    CURRENT_DATE - (days_back || ' days')::interval,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(date)
  LEFT JOIN payments_log pl ON pl.created_at::date = d.date::date AND pl.status = 'success'
  GROUP BY d.date
  ORDER BY d.date;
END;
$$;

-- 7. Get power users (top users by activity)
CREATE OR REPLACE FUNCTION public.admin_get_power_users(limit_count integer DEFAULT 10)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email text,
  neverai_id text,
  leads_this_week bigint,
  total_leads bigint,
  last_active timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    COALESCE(p.email, au.email) as email,
    p.neverai_id,
    (SELECT COUNT(*) FROM prospects pr WHERE pr.user_id = p.user_id AND pr.date_added >= CURRENT_DATE - INTERVAL '7 days')::bigint as leads_this_week,
    (SELECT COUNT(*) FROM prospects pr WHERE pr.user_id = p.user_id)::bigint as total_leads,
    (SELECT MAX(last_seen_at) FROM user_app_access ua WHERE ua.user_id = p.user_id) as last_active
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  ORDER BY leads_this_week DESC, total_leads DESC
  LIMIT limit_count;
END;
$$;
