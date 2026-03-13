
-- AI Tracker Configurations
CREATE TABLE public.ai_tracker_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',
  notify_hour INTEGER NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Insight Preferences
CREATE TABLE public.ai_insight_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_snapshot BOOLEAN NOT NULL DEFAULT true,
  ai_alerts BOOLEAN NOT NULL DEFAULT true,
  coaching_insights BOOLEAN NOT NULL DEFAULT true,
  weekly_team_summary BOOLEAN NOT NULL DEFAULT true,
  snapshot_hour INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_tracker_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insight_preferences ENABLE ROW LEVEL SECURITY;

-- RLS for ai_tracker_configs
CREATE POLICY "Users can manage own tracker configs" ON public.ai_tracker_configs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS for ai_insight_preferences  
CREATE POLICY "Users can manage own insight preferences" ON public.ai_insight_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
