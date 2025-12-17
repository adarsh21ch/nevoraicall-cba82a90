-- Drop the existing policy for members viewing leader's levels
DROP POLICY IF EXISTS "Members can view their leader's levels" ON public.leader_levels;

-- Create updated policy that checks BOTH direct leader and root leader
CREATE POLICY "Members can view their leader's levels" 
ON public.leader_levels 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN profiles leader_p ON (
      upper(leader_p.neverai_id) = upper(p.leaders_id_of_my_leader)
      OR upper(leader_p.neverai_id) = upper(p.root_leader_id)
    )
    WHERE p.user_id = auth.uid() 
    AND leader_p.user_id = leader_levels.leader_id
  )
);