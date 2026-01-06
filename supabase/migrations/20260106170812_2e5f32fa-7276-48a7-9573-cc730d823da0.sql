-- Fix the update_leader_hierarchy function to use neverai_id instead of non-existent leader_id
CREATE OR REPLACE FUNCTION public.update_leader_hierarchy(p_user_id uuid, p_leader_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_leader_profile RECORD;
BEGIN
  -- Use neverai_id instead of leader_id (which doesn't exist)
  SELECT user_id, neverai_id, root_leader_id 
  INTO v_leader_profile
  FROM public.profiles 
  WHERE UPPER(neverai_id) = UPPER(p_leader_id);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Leader ID not found');
  END IF;
  
  IF v_leader_profile.user_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot set yourself as your leader');
  END IF;
  
  UPDATE public.profiles
  SET 
    leaders_id_of_my_leader = v_leader_profile.neverai_id,
    root_leader_id = COALESCE(v_leader_profile.root_leader_id, v_leader_profile.neverai_id),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'leaders_id_of_my_leader', v_leader_profile.neverai_id,
    'root_leader_id', COALESCE(v_leader_profile.root_leader_id, v_leader_profile.neverai_id)
  );
END;
$$;