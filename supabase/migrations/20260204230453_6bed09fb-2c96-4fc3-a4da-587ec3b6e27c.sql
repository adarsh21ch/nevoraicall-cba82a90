-- Fix admin_get_pro_users: explicitly cast payment_amount to bigint
CREATE OR REPLACE FUNCTION public.admin_get_pro_users()
RETURNS TABLE(
  user_id uuid, 
  display_name text, 
  email text, 
  neverai_id text, 
  plan text, 
  subscribed_at timestamp with time zone, 
  expires_at timestamp with time zone, 
  is_admin_override boolean, 
  is_expired boolean, 
  days_remaining integer, 
  payment_amount bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- FIX: Explicitly cast to bigint to match return type
    COALESCE((SELECT pl.amount::bigint FROM payments_log pl WHERE pl.user_id = us.user_id AND pl.status = 'success' ORDER BY pl.created_at DESC LIMIT 1), 0::bigint) as payment_amount
  FROM user_subscriptions us
  JOIN profiles p ON p.user_id = us.user_id
  LEFT JOIN auth.users au ON au.id = us.user_id
  WHERE us.plan = 'pro'
  ORDER BY us.subscribed_at DESC NULLS LAST;
END;
$function$;

-- Fix admin_get_trial_analytics: use 'free_trial_days' config key (matches admin panel)
CREATE OR REPLACE FUNCTION public.admin_get_trial_analytics()
RETURNS TABLE(
  active_trials bigint, 
  expired_trials bigint, 
  converted_to_pro bigint, 
  trial_conversion_rate numeric, 
  avg_days_to_convert numeric, 
  trials_expiring_today bigint, 
  day_1_users bigint, 
  day_2_users bigint, 
  day_3_users bigint, 
  day_4_users bigint, 
  day_5_users bigint, 
  day_6_users bigint, 
  day_7_users bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_days integer;
BEGIN
  -- FIX: Read from 'free_trial_days' config key (matches admin panel) instead of 'trial_duration_days'
  SELECT COALESCE(config_value::integer, 7) INTO v_trial_days
  FROM admin_usage_limits
  WHERE config_key = 'free_trial_days' AND is_enabled = true;
  
  IF v_trial_days IS NULL THEN
    v_trial_days := 7;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH trial_data AS (
    SELECT 
      p.user_id,
      p.created_at as signup_date,
      COALESCE(p.trial_start_date, p.created_at::date) as trial_start,
      us.plan,
      us.subscribed_at,
      EXTRACT(EPOCH FROM (COALESCE(us.subscribed_at, now()) - COALESCE(p.trial_start_date, p.created_at))) / 86400 as days_to_convert,
      EXTRACT(EPOCH FROM (now() - COALESCE(p.trial_start_date, p.created_at))) / 86400 as days_since_signup
    FROM profiles p
    LEFT JOIN user_subscriptions us ON us.user_id = p.user_id
  ),
  totals AS (
    SELECT
      COUNT(CASE WHEN days_since_signup <= v_trial_days AND (plan IS NULL OR plan = 'free') THEN 1 END) as active_trials,
      COUNT(CASE WHEN days_since_signup > v_trial_days AND (plan IS NULL OR plan = 'free') THEN 1 END) as expired_trials,
      COUNT(CASE WHEN plan IN ('pro', 'mini') THEN 1 END) as converted_to_pro,
      COUNT(CASE WHEN days_since_signup <= v_trial_days AND (plan IS NULL OR plan = 'free') 
                      AND DATE(trial_start + (v_trial_days || ' days')::interval) = CURRENT_DATE THEN 1 END) as trials_expiring_today,
      AVG(CASE WHEN plan IN ('pro', 'mini') AND days_to_convert > 0 THEN days_to_convert END) as avg_days,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE THEN 1 END) as day_1,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as day_2,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '2 days' THEN 1 END) as day_3,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '3 days' THEN 1 END) as day_4,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '4 days' THEN 1 END) as day_5,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '5 days' THEN 1 END) as day_6,
      COUNT(CASE WHEN DATE(trial_start) = CURRENT_DATE - INTERVAL '6 days' THEN 1 END) as day_7
    FROM trial_data
  )
  SELECT
    t.active_trials,
    t.expired_trials,
    t.converted_to_pro,
    CASE WHEN (t.active_trials + t.expired_trials + t.converted_to_pro) > 0 
      THEN ROUND((t.converted_to_pro::numeric / (t.active_trials + t.expired_trials + t.converted_to_pro) * 100), 2)
      ELSE 0 
    END as trial_conversion_rate,
    COALESCE(ROUND(t.avg_days, 1), 0) as avg_days_to_convert,
    t.trials_expiring_today,
    t.day_1,
    t.day_2,
    t.day_3,
    t.day_4,
    t.day_5,
    t.day_6,
    t.day_7
  FROM totals t;
END;
$function$;

-- Fix admin_get_recent_payments: explicitly cast amount to bigint
CREATE OR REPLACE FUNCTION public.admin_get_recent_payments(limit_count integer DEFAULT 50)
RETURNS TABLE(
  id uuid, 
  created_at timestamp with time zone, 
  user_email text, 
  user_display_name text, 
  amount bigint, 
  status text, 
  event_type text, 
  razorpay_payment_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH unique_payments AS (
    SELECT DISTINCT ON (pl.razorpay_payment_id) 
      pl.id,
      pl.created_at,
      pl.user_email,
      pl.user_id,
      -- FIX: Explicitly cast to bigint to match return type
      pl.amount::bigint as amount,
      pl.status,
      pl.event_type,
      pl.razorpay_payment_id
    FROM payments_log pl
    WHERE pl.created_at >= '2026-01-17'::timestamp
    ORDER BY pl.razorpay_payment_id, pl.created_at DESC
  )
  SELECT 
    up.id,
    up.created_at,
    COALESCE(up.user_email, p.email) as user_email,
    p.display_name as user_display_name,
    up.amount,
    up.status,
    up.event_type,
    up.razorpay_payment_id
  FROM unique_payments up
  LEFT JOIN profiles p ON p.user_id = up.user_id
  ORDER BY up.created_at DESC
  LIMIT limit_count;
END;
$function$;