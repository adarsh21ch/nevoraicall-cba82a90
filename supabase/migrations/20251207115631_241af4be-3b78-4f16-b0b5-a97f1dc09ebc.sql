-- Add timestamp columns for 5-minute protection on Response and Funnel stage changes
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS action_taken_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS funnel_stage_at TIMESTAMP WITH TIME ZONE;