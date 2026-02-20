
-- Fix admin_get_analytics to use IST dates
CREATE OR REPLACE FUNCTION public.admin_get_analytics()
 RETURNS TABLE(neverai_total_users bigint, neverai_today_active bigint, neverai_week_active bigint, active_pro_users bigint, total_leads bigint, today_leads bigint, week_leads bigint, month_leads bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ist_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT ua.user_id) FROM public.user_app_access ua WHERE ua.app = 'neverai')::bigint as neverai_total_users,
    (SELECT COUNT(DISTINCT ua.user_id) FROM public.user_app_access ua WHERE ua.app = 'neverai' AND (ua.last_seen_at AT TIME ZONE 'Asia/Kolkata')::date = v_ist_today)::bigint as neverai_today_active,
    (SELECT COUNT(DISTINCT ua.user_id) FROM public.user_app_access ua WHERE ua.app = 'neverai' AND (ua.last_seen_at AT TIME ZONE 'Asia/Kolkata')::date >= v_ist_today - 7)::bigint as neverai_week_active,
    (SELECT COUNT(*) FROM public.user_subscriptions WHERE plan = 'pro')::bigint as active_pro_users,
    (SELECT COUNT(*) FROM public.prospects WHERE deleted_at IS NULL)::bigint as total_leads,
    (SELECT COUNT(*) FROM public.prospects WHERE deleted_at IS NULL AND (date_added AT TIME ZONE 'Asia/Kolkata')::date = v_ist_today)::bigint as today_leads,
    (SELECT COUNT(*) FROM public.prospects WHERE deleted_at IS NULL AND (date_added AT TIME ZONE 'Asia/Kolkata')::date >= v_ist_today - 7)::bigint as week_leads,
    (SELECT COUNT(*) FROM public.prospects WHERE deleted_at IS NULL AND (date_added AT TIME ZONE 'Asia/Kolkata')::date >= v_ist_today - 30)::bigint as month_leads;
END;
$function$;

-- Fix admin_get_active_usage_stats to use IST dates
CREATE OR REPLACE FUNCTION public.admin_get_active_usage_stats()
 RETURNS TABLE(leads_importers_today bigint, leads_importers_week bigint, active_callers_today bigint, active_callers_week bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ist_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT user_id) FROM prospects WHERE deleted_at IS NULL AND (date_added AT TIME ZONE 'Asia/Kolkata')::date = v_ist_today)::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM prospects WHERE deleted_at IS NULL AND (date_added AT TIME ZONE 'Asia/Kolkata')::date >= v_ist_today - 7)::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM prospects WHERE deleted_at IS NULL AND (updated_at AT TIME ZONE 'Asia/Kolkata')::date = v_ist_today AND updated_at != date_added)::bigint,
    (SELECT COUNT(DISTINCT user_id) FROM prospects WHERE deleted_at IS NULL AND (updated_at AT TIME ZONE 'Asia/Kolkata')::date >= v_ist_today - 7 AND updated_at != date_added)::bigint;
END;
$function$;

-- Fix update_daily_stats to use IST date
CREATE OR REPLACE FUNCTION public.update_daily_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_total INTEGER;
  v_breakdown JSONB;
  v_ist_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;
  
  SELECT COUNT(*) INTO v_total
  FROM public.prospects
  WHERE user_id = v_user_id AND deleted_at IS NULL;
  
  SELECT jsonb_build_object(
    'by_stage', COALESCE((
      SELECT jsonb_object_agg(funnel_stage, cnt)
      FROM (
        SELECT funnel_stage, COUNT(*) as cnt
        FROM public.prospects
        WHERE user_id = v_user_id AND deleted_at IS NULL AND funnel_stage IS NOT NULL
        GROUP BY funnel_stage
      ) s
    ), '{}'::jsonb),
    'by_response', COALESCE((
      SELECT jsonb_object_agg(action_taken, cnt)
      FROM (
        SELECT action_taken, COUNT(*) as cnt
        FROM public.prospects
        WHERE user_id = v_user_id AND deleted_at IS NULL AND action_taken IS NOT NULL
        GROUP BY action_taken
      ) r
    ), '{}'::jsonb),
    'by_status', COALESCE((
      SELECT jsonb_object_agg(prospect_status, cnt)
      FROM (
        SELECT prospect_status, COUNT(*) as cnt
        FROM public.prospects
        WHERE user_id = v_user_id AND deleted_at IS NULL AND prospect_status IS NOT NULL
        GROUP BY prospect_status
      ) st
    ), '{}'::jsonb)
  ) INTO v_breakdown;
  
  INSERT INTO public.daily_stats (user_id, date_logged, total_leads, breakdown_json, updated_at)
  VALUES (v_user_id, v_ist_today, v_total, v_breakdown, now())
  ON CONFLICT (user_id, date_logged)
  DO UPDATE SET 
    total_leads = EXCLUDED.total_leads,
    breakdown_json = EXCLUDED.breakdown_json,
    updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;
