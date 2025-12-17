-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Users can view their own prospects" ON prospects;
DROP POLICY IF EXISTS "Leader hierarchy prospect access" ON prospects;

-- Step 2: Create simplified L1-only policy
-- Users can see: their own prospects + their direct L1 downline's prospects
CREATE POLICY "Self and L1 downline prospect access" ON prospects
FOR SELECT USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM profiles AS member
    WHERE member.user_id = prospects.user_id 
    AND member.allow_leader_to_view = true 
    AND member.leaders_id_of_my_leader = (
      SELECT neverai_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);