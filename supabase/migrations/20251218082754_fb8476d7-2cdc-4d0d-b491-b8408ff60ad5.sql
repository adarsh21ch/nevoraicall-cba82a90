-- TASK 1: Fix RLS for profiles (allow authenticated users to read for Leader lookup)
-- Add a policy that allows any authenticated user to read basic profile info for leader lookup
CREATE POLICY "Authenticated users can lookup profiles by leader_id"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- TASK 1: Create daily_stats table for frozen history snapshots
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date_logged DATE NOT NULL DEFAULT CURRENT_DATE,
  total_leads INTEGER NOT NULL DEFAULT 0,
  breakdown_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date_logged)
);

-- Enable RLS on daily_stats
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_stats
CREATE POLICY "Users can view their own daily stats"
ON public.daily_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily stats"
ON public.daily_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily stats"
ON public.daily_stats
FOR UPDATE
USING (auth.uid() = user_id);

-- Function to update daily stats when prospects change
CREATE OR REPLACE FUNCTION public.update_daily_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total INTEGER;
  v_breakdown JSONB;
BEGIN
  -- Get user_id from the affected row
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;
  
  -- Calculate total leads for user
  SELECT COUNT(*) INTO v_total
  FROM public.prospects
  WHERE user_id = v_user_id;
  
  -- Calculate breakdown by funnel_stage and action_taken
  SELECT jsonb_build_object(
    'by_stage', COALESCE((
      SELECT jsonb_object_agg(funnel_stage, cnt)
      FROM (
        SELECT funnel_stage, COUNT(*) as cnt
        FROM public.prospects
        WHERE user_id = v_user_id AND funnel_stage IS NOT NULL
        GROUP BY funnel_stage
      ) s
    ), '{}'::jsonb),
    'by_response', COALESCE((
      SELECT jsonb_object_agg(action_taken, cnt)
      FROM (
        SELECT action_taken, COUNT(*) as cnt
        FROM public.prospects
        WHERE user_id = v_user_id AND action_taken IS NOT NULL
        GROUP BY action_taken
      ) r
    ), '{}'::jsonb),
    'by_status', COALESCE((
      SELECT jsonb_object_agg(prospect_status, cnt)
      FROM (
        SELECT prospect_status, COUNT(*) as cnt
        FROM public.prospects
        WHERE user_id = v_user_id AND prospect_status IS NOT NULL
        GROUP BY prospect_status
      ) st
    ), '{}'::jsonb)
  ) INTO v_breakdown;
  
  -- Upsert daily stats for today
  INSERT INTO public.daily_stats (user_id, date_logged, total_leads, breakdown_json, updated_at)
  VALUES (v_user_id, CURRENT_DATE, v_total, v_breakdown, now())
  ON CONFLICT (user_id, date_logged)
  DO UPDATE SET 
    total_leads = EXCLUDED.total_leads,
    breakdown_json = EXCLUDED.breakdown_json,
    updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on prospects table
DROP TRIGGER IF EXISTS trigger_update_daily_stats ON public.prospects;
CREATE TRIGGER trigger_update_daily_stats
AFTER INSERT OR UPDATE OR DELETE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_daily_stats();