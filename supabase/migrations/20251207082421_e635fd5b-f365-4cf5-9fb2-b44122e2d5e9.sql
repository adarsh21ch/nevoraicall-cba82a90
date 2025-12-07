-- Migrate existing prospects with funnel_stage = 'Enrollment' to have action_taken = 'Enrollment' and funnel_stage = 'Day 1'
UPDATE public.prospects 
SET 
  action_taken = 'Enrollment',
  funnel_stage = 'Day 1',
  updated_at = now()
WHERE funnel_stage = 'Enrollment';