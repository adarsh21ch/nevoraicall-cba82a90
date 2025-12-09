-- Add RLS policy to allow viewing profiles of users who have shared access with you
CREATE POLICY "Users can view profiles of users who shared with them" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.team_access 
    WHERE team_access.owner_user_id = profiles.user_id 
    AND team_access.shared_with_user_id = auth.uid()
  )
);

-- Add RLS policy to allow viewing profiles of users you've shared with
CREATE POLICY "Users can view profiles of users they shared with" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.team_access 
    WHERE team_access.shared_with_user_id = profiles.user_id 
    AND team_access.owner_user_id = auth.uid()
  )
);