-- =============================================
-- Phase 1: Daily Upload Tracking Table
-- =============================================

CREATE TABLE public.user_daily_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  upload_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, upload_date)
);

-- Enable RLS
ALTER TABLE user_daily_uploads ENABLE ROW LEVEL SECURITY;

-- Users can read their own daily upload records
CREATE POLICY "Users can read own daily uploads"
  ON user_daily_uploads FOR SELECT
  USING (auth.uid() = user_id);

-- Index for efficient lookups
CREATE INDEX idx_daily_uploads_user_date ON user_daily_uploads(user_id, upload_date);

-- =============================================
-- Phase 2: Check Upload Limit Function
-- =============================================

CREATE OR REPLACE FUNCTION public.check_upload_limit(p_user_id UUID, p_count INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_is_pro BOOLEAN;
  v_total_added INTEGER;
  v_today_count INTEGER;
  v_free_total_limit INTEGER;
  v_free_daily_limit INTEGER;
  v_free_daily_enabled BOOLEAN;
  v_pro_daily_limit INTEGER;
  v_pro_daily_enabled BOOLEAN;
BEGIN
  -- Check if user is Pro (from user_subscriptions)
  SELECT (plan = 'pro' AND (expires_at IS NULL OR expires_at > NOW()))
  INTO v_is_pro
  FROM user_subscriptions
  WHERE user_id = p_user_id;
  
  v_is_pro := COALESCE(v_is_pro, false);
  
  -- Get user's total leads count from prospects table
  SELECT COUNT(*)::INTEGER INTO v_total_added
  FROM prospects WHERE user_id = p_user_id;
  
  v_total_added := COALESCE(v_total_added, 0);
  
  -- Get today's upload count
  SELECT COALESCE(upload_count, 0) INTO v_today_count
  FROM user_daily_uploads
  WHERE user_id = p_user_id AND upload_date = CURRENT_DATE;
  
  v_today_count := COALESCE(v_today_count, 0);
  
  -- Get limits from admin config
  SELECT config_value, is_enabled INTO v_free_total_limit, v_free_daily_enabled
  FROM admin_usage_limits WHERE config_key = 'free_total_leads';
  
  SELECT config_value, is_enabled INTO v_free_daily_limit, v_free_daily_enabled
  FROM admin_usage_limits WHERE config_key = 'free_daily_upload';
  
  SELECT config_value, is_enabled INTO v_pro_daily_limit, v_pro_daily_enabled
  FROM admin_usage_limits WHERE config_key = 'pro_daily_upload';
  
  -- Defaults
  v_free_total_limit := COALESCE(v_free_total_limit, 1000);
  v_free_daily_limit := COALESCE(v_free_daily_limit, 50);
  v_free_daily_enabled := COALESCE(v_free_daily_enabled, true);
  v_pro_daily_limit := COALESCE(v_pro_daily_limit, 500);
  v_pro_daily_enabled := COALESCE(v_pro_daily_enabled, false);
  
  -- Pro user check
  IF v_is_pro THEN
    IF v_pro_daily_enabled AND v_pro_daily_limit > 0 AND (v_today_count + p_count) > v_pro_daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Daily Pro upload limit reached (' || v_pro_daily_limit || '/day)',
        'limit_type', 'pro_daily',
        'today_count', v_today_count,
        'limit_value', v_pro_daily_limit
      );
    END IF;
    RETURN jsonb_build_object('allowed', true, 'reason', '', 'limit_type', 'pro', 'today_count', v_today_count);
  END IF;
  
  -- Free user: check total limit first
  IF (v_total_added + p_count) > v_free_total_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Total free leads limit reached (' || v_free_total_limit || '). Upgrade to Pro for unlimited.',
      'limit_type', 'total',
      'total_count', v_total_added,
      'limit_value', v_free_total_limit
    );
  END IF;
  
  -- Free user: check daily limit (if enabled)
  IF v_free_daily_enabled AND (v_today_count + p_count) > v_free_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Daily free upload limit reached (' || v_free_daily_limit || '/day). Try again tomorrow or upgrade to Pro.',
      'limit_type', 'daily',
      'today_count', v_today_count,
      'limit_value', v_free_daily_limit
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'reason', '', 'limit_type', 'free', 'today_count', v_today_count);
END;
$$;

-- =============================================
-- Phase 3: Increment Daily Upload Function
-- =============================================

CREATE OR REPLACE FUNCTION public.increment_daily_upload(p_user_id UUID, p_count INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO user_daily_uploads (user_id, upload_date, upload_count)
  VALUES (p_user_id, CURRENT_DATE, p_count)
  ON CONFLICT (user_id, upload_date)
  DO UPDATE SET 
    upload_count = user_daily_uploads.upload_count + p_count,
    updated_at = now()
  RETURNING upload_count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;

-- =============================================
-- Phase 4: Add offer_payment_link to admin_offers
-- =============================================

ALTER TABLE admin_offers 
ADD COLUMN IF NOT EXISTS offer_payment_link TEXT;