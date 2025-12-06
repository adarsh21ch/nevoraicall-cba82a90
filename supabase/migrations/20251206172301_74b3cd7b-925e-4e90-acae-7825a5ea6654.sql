-- Add status column to user_subscriptions table
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'free';

-- Update existing records: set status based on current plan
UPDATE public.user_subscriptions 
SET status = CASE 
  WHEN plan = 'pro' THEN 'active' 
  ELSE 'free' 
END;