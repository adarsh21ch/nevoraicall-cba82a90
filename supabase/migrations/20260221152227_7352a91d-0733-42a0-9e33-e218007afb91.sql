
-- Security definer function to validate direct team membership
CREATE OR REPLACE FUNCTION public.is_direct_team_member(p_sender_id uuid, p_receiver_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sender_neverai_id text;
  v_receiver_leaders_id text;
BEGIN
  -- Get sender's neverai_id
  SELECT neverai_id INTO v_sender_neverai_id
  FROM profiles WHERE user_id = p_sender_id;

  -- Get receiver's leaders_id_of_my_leader
  SELECT leaders_id_of_my_leader INTO v_receiver_leaders_id
  FROM profiles WHERE user_id = p_receiver_id;

  IF v_sender_neverai_id IS NULL OR v_receiver_leaders_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN UPPER(TRIM(v_receiver_leaders_id)) = UPPER(TRIM(v_sender_neverai_id));
END;
$$;

-- Create shared_leads table
CREATE TABLE public.shared_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  lead_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  imported_at timestamptz
);

-- Enable RLS
ALTER TABLE public.shared_leads ENABLE ROW LEVEL SECURITY;

-- SELECT: sender or receiver can read their own rows
CREATE POLICY "Users can view their shared leads"
ON public.shared_leads FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: only authenticated, sender_id must be self
CREATE POLICY "Users can create shares"
ON public.shared_leads FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- UPDATE: only receiver can update (to mark imported)
CREATE POLICY "Receivers can update shared leads"
ON public.shared_leads FOR UPDATE
USING (auth.uid() = receiver_id);

-- Validation trigger to ensure receiver is direct team member
CREATE OR REPLACE FUNCTION public.validate_shared_lead_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_direct_team_member(NEW.sender_id, NEW.receiver_id) THEN
    RAISE EXCEPTION 'Receiver is not a direct team member';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_shared_lead_before_insert
BEFORE INSERT ON public.shared_leads
FOR EACH ROW
EXECUTE FUNCTION public.validate_shared_lead_insert();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_leads;
