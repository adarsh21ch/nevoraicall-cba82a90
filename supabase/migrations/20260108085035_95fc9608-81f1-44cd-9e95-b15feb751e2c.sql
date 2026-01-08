-- Update can_leader_view_member to use case-insensitive matching
CREATE OR REPLACE FUNCTION public.can_leader_view_member(
  p_leader_user_id uuid,
  p_member_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles leader
    JOIN public.profiles member
      ON member.user_id = p_member_user_id
     AND member.allow_leader_to_view = true
     AND lower(member.leaders_id_of_my_leader) = lower(leader.neverai_id)
    WHERE leader.user_id = p_leader_user_id
  );
$$;