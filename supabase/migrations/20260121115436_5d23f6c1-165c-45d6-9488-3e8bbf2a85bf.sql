-- =====================================================
-- STEP 2: BACKFILL UPLINE_EMAIL FROM EXISTING RELATIONSHIPS
-- =====================================================

-- Backfill upline_email from existing leader relationships
-- This maps leaders_id_of_my_leader (neverai_id) to the leader's email
UPDATE public.profiles p
SET upline_email = leader.email
FROM public.profiles leader
WHERE p.leaders_id_of_my_leader IS NOT NULL
  AND p.upline_email IS NULL
  AND leader.email IS NOT NULL
  AND (
    leader.neverai_id = p.leaders_id_of_my_leader
    OR public.normalize_leader_id(leader.neverai_id) = public.normalize_leader_id(p.leaders_id_of_my_leader)
  );

-- =====================================================
-- STEP 3: CREATE NEW RPC FUNCTIONS
-- =====================================================

-- Function to look up user by email (for upline connection)
CREATE OR REPLACE FUNCTION public.get_user_by_email(target_email text)
RETURNS TABLE(user_id uuid, display_name text, email text, neverai_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.display_name, p.email, p.neverai_id
  FROM public.profiles p
  WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(target_email));
END;
$$;

-- Function to update upline hierarchy using email instead of leader ID
CREATE OR REPLACE FUNCTION public.update_upline_by_email(p_user_id uuid, p_upline_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_upline_profile RECORD;
  v_normalized_email text;
BEGIN
  -- Normalize the input email
  v_normalized_email := LOWER(TRIM(p_upline_email));
  
  -- Look up the upline by email
  SELECT user_id, neverai_id, email, root_leader_id, display_name
  INTO v_upline_profile
  FROM public.profiles 
  WHERE LOWER(TRIM(email)) = v_normalized_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No user found with this email address');
  END IF;
  
  IF v_upline_profile.user_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot set yourself as your upline');
  END IF;
  
  -- Update the user's profile with the upline relationship
  UPDATE public.profiles
  SET 
    upline_email = v_normalized_email,
    leaders_id_of_my_leader = v_upline_profile.neverai_id,
    root_leader_id = COALESCE(v_upline_profile.root_leader_id, v_upline_profile.neverai_id),
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'upline_email', v_normalized_email,
    'upline_name', v_upline_profile.display_name,
    'leaders_id_of_my_leader', v_upline_profile.neverai_id,
    'root_leader_id', COALESCE(v_upline_profile.root_leader_id, v_upline_profile.neverai_id)
  );
END;
$$;

-- Function to clear upline relationship
CREATE OR REPLACE FUNCTION public.clear_upline_relationship(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    upline_email = NULL,
    leaders_id_of_my_leader = NULL,
    root_leader_id = NULL,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Drop and recreate admin_search_users with new upline_email column
DROP FUNCTION IF EXISTS public.admin_search_users(text, integer, integer, text);

CREATE OR REPLACE FUNCTION public.admin_search_users(
  search_query text DEFAULT '',
  page_size integer DEFAULT 50,
  page_offset integer DEFAULT 0,
  plan_filter text DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid, 
  email text, 
  display_name text, 
  neverai_id text, 
  plan text, 
  is_admin_override boolean, 
  subscribed_at timestamp with time zone, 
  expires_at timestamp with time zone, 
  created_at timestamp with time zone,
  upline_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_query text;
BEGIN
  -- Only allow admins
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Normalize the search query for leader ID matching (legacy support)
  normalized_query := public.normalize_leader_id(search_query);

  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(p.email, p.display_name, 'User ' || LEFT(p.user_id::text, 8)) as email,
    p.display_name,
    p.neverai_id,
    COALESCE(us.plan::text, 'free') as plan,
    COALESCE(us.is_admin_override, false) as is_admin_override,
    us.subscribed_at,
    us.expires_at,
    p.created_at,
    p.upline_email
  FROM public.profiles p
  LEFT JOIN public.user_subscriptions us ON us.user_id = p.user_id
  WHERE 
    (
      search_query = '' 
      OR search_query IS NULL
      -- Search by user email
      OR p.email ILIKE '%' || search_query || '%'
      -- Search by display name
      OR p.display_name ILIKE '%' || search_query || '%'
      -- Search by upline email (NEW)
      OR p.upline_email ILIKE '%' || search_query || '%'
      -- Legacy: Search by leader ID (still supported for admin)
      OR p.neverai_id ILIKE '%' || search_query || '%'
      OR (normalized_query IS NOT NULL AND p.neverai_id = normalized_query)
    )
    AND (
      plan_filter IS NULL
      OR plan_filter = ''
      OR (plan_filter = 'pro' AND COALESCE(us.plan::text, 'free') = 'pro')
      OR (plan_filter = 'free' AND COALESCE(us.plan::text, 'free') != 'pro')
    )
  ORDER BY p.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;