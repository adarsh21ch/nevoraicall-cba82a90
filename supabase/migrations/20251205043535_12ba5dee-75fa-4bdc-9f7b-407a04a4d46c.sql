-- Add state and currently_doing fields to prospects table
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS currently_doing text;