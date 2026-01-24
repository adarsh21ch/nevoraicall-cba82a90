-- ════════════════════════════════════════════════════════════════════════════
-- AUTO-CREATE SHARE TOKEN TRIGGER
-- Automatically generates a share token when a new form is created
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.auto_create_share_token()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO nevorai_form_shares (form_id, token, created_by)
  VALUES (NEW.id, encode(gen_random_bytes(16), 'hex'), NEW.owner_user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on nevorai_forms table
DROP TRIGGER IF EXISTS trigger_auto_share_token ON nevorai_forms;
CREATE TRIGGER trigger_auto_share_token
  AFTER INSERT ON nevorai_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_share_token();

-- ════════════════════════════════════════════════════════════════════════════
-- GENERATE TOKEN FOR EXISTING FORM (Ads Leads Tracking)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO nevorai_form_shares (form_id, token, created_by)
SELECT id, encode(gen_random_bytes(16), 'hex'), owner_user_id
FROM nevorai_forms
WHERE id = '5648b980-af09-4885-afee-a29b4139a83f'
  AND NOT EXISTS (
    SELECT 1 FROM nevorai_form_shares WHERE form_id = '5648b980-af09-4885-afee-a29b4139a83f'
  );

-- ════════════════════════════════════════════════════════════════════════════
-- HELPER RPC: GET FORM SHARE URL
-- Returns the full shareable URL for a form
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_form_share_url(p_form_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Verify user owns the form
  IF NOT EXISTS (
    SELECT 1 FROM nevorai_forms 
    WHERE id = p_form_id AND owner_user_id = auth.uid()
  ) THEN
    RETURN NULL;
  END IF;

  -- Get the most recent token for this form
  SELECT token INTO v_token
  FROM nevorai_form_shares
  WHERE form_id = p_form_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN 'https://nevorai.com/f/' || v_token;
END;
$$;