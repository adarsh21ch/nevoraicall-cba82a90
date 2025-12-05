-- Add gender column
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS gender text;

-- Convert age column to age_or_dob (string type for flexible "25" or "1995-01-15" input)
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS age_or_dob text;

-- Migrate existing age data to age_or_dob
UPDATE public.prospects SET age_or_dob = age::text WHERE age IS NOT NULL AND age_or_dob IS NULL;

-- Drop columns that are no longer needed
ALTER TABLE public.prospects DROP COLUMN IF EXISTS email;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS notes;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS funnel_stage;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS action_taken;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS prospect_status;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS priority;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS age;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS why_need;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS currently_doing;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS enrollment_status;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS last_contact_date;