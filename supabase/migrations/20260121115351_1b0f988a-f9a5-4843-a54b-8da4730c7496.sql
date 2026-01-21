-- =====================================================
-- STEP 1: ADD upline_email COLUMN TO PROFILES
-- =====================================================

-- Add upline_email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upline_email text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_upline_email 
ON public.profiles (upline_email) 
WHERE upline_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
ON public.profiles (LOWER(email)) 
WHERE email IS NOT NULL;