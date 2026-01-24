-- Add form_type column to nevorai_forms table
ALTER TABLE nevorai_forms 
  ADD COLUMN IF NOT EXISTS form_type TEXT DEFAULT 'custom';

-- Add check constraint to validate form_type values
-- Use DO block to handle "constraint already exists" gracefully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'nevorai_forms_form_type_check'
  ) THEN
    ALTER TABLE nevorai_forms 
      ADD CONSTRAINT nevorai_forms_form_type_check 
      CHECK (form_type IN ('tracking', 'feedback', 'giveaway', 'custom'));
  END IF;
END $$;