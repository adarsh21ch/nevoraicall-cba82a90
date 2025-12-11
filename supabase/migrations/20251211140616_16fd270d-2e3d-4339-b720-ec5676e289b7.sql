-- Create leader_member_aliases table for personal renaming
CREATE TABLE public.leader_member_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id UUID NOT NULL,
  member_id UUID NOT NULL,
  alias_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(leader_id, member_id)
);

-- Enable RLS
ALTER TABLE public.leader_member_aliases ENABLE ROW LEVEL SECURITY;

-- Leaders can only manage their own aliases
CREATE POLICY "Leaders can view their own aliases"
ON public.leader_member_aliases
FOR SELECT
USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can create their own aliases"
ON public.leader_member_aliases
FOR INSERT
WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their own aliases"
ON public.leader_member_aliases
FOR UPDATE
USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete their own aliases"
ON public.leader_member_aliases
FOR DELETE
USING (auth.uid() = leader_id);

-- Add trigger for updated_at
CREATE TRIGGER update_leader_member_aliases_updated_at
BEFORE UPDATE ON public.leader_member_aliases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance on prospects table
CREATE INDEX IF NOT EXISTS idx_prospects_user_id_updated_at ON public.prospects(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_user_id_action_taken ON public.prospects(user_id, action_taken);
CREATE INDEX IF NOT EXISTS idx_prospects_user_id_funnel_stage ON public.prospects(user_id, funnel_stage);