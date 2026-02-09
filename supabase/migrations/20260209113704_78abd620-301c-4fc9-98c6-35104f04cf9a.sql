
-- =============================================
-- Phase 1: Upgrade admin_feature_flags table
-- =============================================

-- Add new columns for trial access and numeric limits
ALTER TABLE public.admin_feature_flags 
  ADD COLUMN IF NOT EXISTS trial_access BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS free_limit INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pro_limit INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_limit INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- =============================================
-- Seed new feature keys (skip existing ones)
-- =============================================

INSERT INTO public.admin_feature_flags (feature_key, feature_name, description, free_access, pro_access, trial_access, is_enabled, category, free_limit, pro_limit, trial_limit)
VALUES
  -- Calling features
  ('calling_tab', 'Calling Tab', 'Access to the calling/follow-up tab', true, true, true, true, 'calling', NULL, NULL, NULL),
  ('personal_tags', 'Personal Tags', 'Create and manage personal tags', true, true, true, true, 'calling', NULL, NULL, NULL),
  ('tracking_tags', 'Tracking Tags', 'Custom tracking tags for prospects', false, true, true, true, 'calling', NULL, NULL, NULL),
  ('advanced_filters', 'Advanced Filters', 'Advanced prospect filtering options', false, true, true, true, 'calling', NULL, NULL, NULL),
  ('retargeting_by_tags', 'Retargeting by Tags', 'Filter and retarget prospects by tags', false, true, true, true, 'calling', NULL, NULL, NULL),
  ('followup_list_by_tag', 'Follow-up List by Tag', 'Create follow-up lists filtered by tag', false, true, true, true, 'calling', NULL, NULL, NULL),
  
  -- Leads features
  ('lead_import', 'Lead Import', 'Import leads from Excel/CSV', true, true, true, true, 'leads', NULL, NULL, NULL),
  ('daily_lead_limit', 'Daily Lead Limit', 'Maximum leads that can be added per day', true, true, true, true, 'leads', 50, NULL, NULL),
  ('total_lead_limit', 'Total Lead Limit', 'Maximum total leads allowed', true, true, true, true, 'leads', 200, NULL, NULL),
  
  -- Tracking features
  ('auto_tracking_personal', 'Auto Tracking (Personal)', 'Automatic personal tracking from prospect data', false, true, true, true, 'tracking', NULL, NULL, NULL),
  ('auto_tracking_team', 'Auto Tracking (Team)', 'Automatic team tracking sync', false, true, true, true, 'tracking', NULL, NULL, NULL),
  
  -- Todo features
  ('todo_create', 'Create Todos', 'Create and manage to-do items', true, true, true, true, 'todo', NULL, NULL, NULL),
  ('todo_delete', 'Delete Todos', 'Delete to-do items', true, true, true, true, 'todo', NULL, NULL, NULL),
  
  -- Export & Automation
  ('export_data', 'Export Data', 'Export prospects and tracking data', false, true, true, true, 'export', NULL, NULL, NULL),
  ('automation_followups', 'Automation Follow-ups', 'Automated follow-up reminders', false, true, true, true, 'automation', NULL, NULL, NULL)
ON CONFLICT (feature_key) DO NOTHING;

-- Update existing features with categories and trial_access
UPDATE public.admin_feature_flags SET category = 'analytics', trial_access = true WHERE feature_key = 'insights';
UPDATE public.admin_feature_flags SET category = 'export', trial_access = true WHERE feature_key = 'export';
UPDATE public.admin_feature_flags SET category = 'analytics', trial_access = true WHERE feature_key = 'ai_tips';
UPDATE public.admin_feature_flags SET category = 'team', trial_access = true WHERE feature_key = 'team_sync';
UPDATE public.admin_feature_flags SET category = 'team', trial_access = true WHERE feature_key = 'team_view';
UPDATE public.admin_feature_flags SET category = 'analytics', trial_access = true WHERE feature_key = 'funnel_analytics';

-- =============================================
-- Update get_app_config RPC to include new columns
-- =============================================

CREATE OR REPLACE FUNCTION public.get_app_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
          'promo_code', promo_code,
          'offer_payment_link', offer_payment_link
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
          'free_access', COALESCE(free_access, false),
          'pro_access', COALESCE(pro_access, true),
          'trial_access', COALESCE(trial_access, true),
          'is_enabled', COALESCE(is_enabled, true),
          'free_limit', free_limit,
          'pro_limit', pro_limit,
          'trial_limit', trial_limit,
          'category', COALESCE(category, 'general')
        )
      )
      FROM admin_feature_flags
    ), '{}'::jsonb)
  );
END;
$$;
