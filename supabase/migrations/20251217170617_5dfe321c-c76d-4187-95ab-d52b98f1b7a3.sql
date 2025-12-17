-- Drop the existing L1-only policy
DROP POLICY IF EXISTS "Self and L1 downline prospect access" ON prospects;
DROP POLICY IF EXISTS "Users can view own and L1 downline prospects" ON prospects;

-- Create the new 3-layer hierarchy policy
CREATE POLICY "Users can view own and L1-L3 downline prospects"
ON prospects
FOR SELECT
USING (
  -- Self: user's own prospects
  user_id = auth.uid()
  
  OR EXISTS (
    -- Get current user's neverai_id (leader ID)
    SELECT 1
    FROM profiles my_profile
    WHERE my_profile.user_id = auth.uid()
    AND (
      -- L1: Direct downline (their upline = my leader ID)
      EXISTS (
        SELECT 1 FROM profiles l1
        WHERE l1.user_id = prospects.user_id
        AND l1.leaders_id_of_my_leader = my_profile.neverai_id
      )
      
      -- L2: Downline of L1 members
      OR EXISTS (
        SELECT 1 FROM profiles l2
        JOIN profiles l1 ON l2.leaders_id_of_my_leader = l1.neverai_id
        WHERE l2.user_id = prospects.user_id
        AND l1.leaders_id_of_my_leader = my_profile.neverai_id
      )
      
      -- L3: Downline of L2 members
      OR EXISTS (
        SELECT 1 FROM profiles l3
        JOIN profiles l2 ON l3.leaders_id_of_my_leader = l2.neverai_id
        JOIN profiles l1 ON l2.leaders_id_of_my_leader = l1.neverai_id
        WHERE l3.user_id = prospects.user_id
        AND l1.leaders_id_of_my_leader = my_profile.neverai_id
      )
    )
  )
);