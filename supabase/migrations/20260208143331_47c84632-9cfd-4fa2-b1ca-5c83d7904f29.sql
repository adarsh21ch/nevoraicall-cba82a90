
-- Function: resolve upline_leader_id from profiles before row is written
CREATE OR REPLACE FUNCTION public.resolve_upline_leader_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upline_email    text;
  v_leader_neverai  text;
  v_resolved_uuid   uuid;
BEGIN
  -- 1. Look up the writing user's profile
  SELECT p.upline_email, p.leaders_id_of_my_leader
    INTO v_upline_email, v_leader_neverai
    FROM profiles p
   WHERE p.user_id = NEW.user_id
   LIMIT 1;

  v_resolved_uuid := NULL;

  -- 2. Primary: resolve by upline_email
  IF v_upline_email IS NOT NULL AND v_upline_email <> '' THEN
    SELECT p2.user_id INTO v_resolved_uuid
      FROM profiles p2
     WHERE lower(p2.email) = lower(v_upline_email)
     LIMIT 1;
  END IF;

  -- 3. Fallback: resolve by leaders_id_of_my_leader (neverai_id)
  IF v_resolved_uuid IS NULL
     AND v_leader_neverai IS NOT NULL
     AND v_leader_neverai <> '' THEN
    SELECT p3.user_id INTO v_resolved_uuid
      FROM profiles p3
     WHERE p3.neverai_id = v_leader_neverai
     LIMIT 1;
  END IF;

  -- 4. Set the resolved value (may be NULL if no upline found)
  NEW.upline_leader_id := v_resolved_uuid;

  RETURN NEW;
END;
$$;

-- Trigger on personal_snapshot_v2
DROP TRIGGER IF EXISTS trg_resolve_upline_personal ON public.personal_snapshot_v2;
CREATE TRIGGER trg_resolve_upline_personal
  BEFORE INSERT OR UPDATE ON public.personal_snapshot_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_upline_leader_id();

-- Trigger on total_snapshot_v2
DROP TRIGGER IF EXISTS trg_resolve_upline_total ON public.total_snapshot_v2;
CREATE TRIGGER trg_resolve_upline_total
  BEFORE INSERT OR UPDATE ON public.total_snapshot_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_upline_leader_id();
