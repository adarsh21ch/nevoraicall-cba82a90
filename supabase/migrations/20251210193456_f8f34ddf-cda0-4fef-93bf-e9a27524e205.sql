-- Add allowed_tabs column to team_access for granular tab permissions
-- Default: all tabs allowed (null means all tabs visible)
ALTER TABLE public.team_access 
ADD COLUMN IF NOT EXISTS allowed_tabs text[] DEFAULT NULL;

-- NULL means all tabs allowed (full access - default)
-- Empty array means no tabs allowed
-- Array with values like ['calling', 'follow_up', 'activity', 'todo'] means only those tabs visible

COMMENT ON COLUMN public.team_access.allowed_tabs IS 'Array of tab names the viewer can access. NULL means full access to all tabs.';