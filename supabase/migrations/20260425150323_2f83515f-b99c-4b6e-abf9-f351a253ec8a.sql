-- ============================================================
-- Recently Deleted v2: deletion batches + sheet soft-delete
-- ============================================================

-- 1. Add deletion-batch metadata to prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS deletion_batch_id uuid,
  ADD COLUMN IF NOT EXISTS deletion_type text;

CREATE INDEX IF NOT EXISTS idx_prospects_deletion_batch
  ON public.prospects(deletion_batch_id)
  WHERE deletion_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_deleted_at_user
  ON public.prospects(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 2. Soft-delete support on sheets
ALTER TABLE public.sheets
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_batch_id uuid,
  ADD COLUMN IF NOT EXISTS original_name text;

CREATE INDEX IF NOT EXISTS idx_sheets_deleted_at_user
  ON public.sheets(user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 3. Deletion batches table
CREATE TABLE IF NOT EXISTS public.deletion_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deletion_type text NOT NULL CHECK (deletion_type IN ('single','bulk','sheet')),
  sheet_id uuid,
  sheet_name text,
  lead_count integer NOT NULL DEFAULT 0,
  preview_name text,
  preview_phone text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_deletion_batches_user_deleted
  ON public.deletion_batches(user_id, deleted_at DESC);

ALTER TABLE public.deletion_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own deletion batches" ON public.deletion_batches;
CREATE POLICY "Users view own deletion batches"
  ON public.deletion_batches FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own deletion batches" ON public.deletion_batches;
CREATE POLICY "Users create own deletion batches"
  ON public.deletion_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own deletion batches" ON public.deletion_batches;
CREATE POLICY "Users delete own deletion batches"
  ON public.deletion_batches FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own deletion batches" ON public.deletion_batches;
CREATE POLICY "Users update own deletion batches"
  ON public.deletion_batches FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Helper: restore a batch (recreates sheet if needed)
CREATE OR REPLACE FUNCTION public.restore_deletion_batch(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.deletion_batches%ROWTYPE;
  v_target_sheet_id uuid;
  v_restored_count int := 0;
BEGIN
  SELECT * INTO v_batch FROM public.deletion_batches
  WHERE id = p_batch_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'batch_not_found');
  END IF;

  v_target_sheet_id := v_batch.sheet_id;

  -- If batch was a sheet deletion, restore the sheet itself (or recreate)
  IF v_batch.deletion_type = 'sheet' AND v_batch.sheet_id IS NOT NULL THEN
    UPDATE public.sheets
       SET deleted_at = NULL, deletion_batch_id = NULL
     WHERE id = v_batch.sheet_id AND user_id = auth.uid();

    IF NOT FOUND THEN
      INSERT INTO public.sheets (user_id, name)
      VALUES (auth.uid(), COALESCE(v_batch.sheet_name, 'Restored sheet'))
      RETURNING id INTO v_target_sheet_id;
    END IF;
  ELSE
    -- For single/bulk: if the original sheet was soft-deleted, restore it too
    IF v_target_sheet_id IS NOT NULL THEN
      UPDATE public.sheets
         SET deleted_at = NULL, deletion_batch_id = NULL
       WHERE id = v_target_sheet_id
         AND user_id = auth.uid()
         AND deleted_at IS NOT NULL;
    END IF;
  END IF;

  -- Restore prospects in this batch and re-point them to the (possibly new) sheet id
  UPDATE public.prospects
     SET deleted_at = NULL,
         deletion_batch_id = NULL,
         deletion_type = NULL,
         sheet_id = COALESCE(v_target_sheet_id, sheet_id)
   WHERE deletion_batch_id = p_batch_id
     AND user_id = auth.uid();
  GET DIAGNOSTICS v_restored_count = ROW_COUNT;

  -- Remove the batch record
  DELETE FROM public.deletion_batches WHERE id = p_batch_id AND user_id = auth.uid();

  RETURN jsonb_build_object(
    'ok', true,
    'restored_count', v_restored_count,
    'sheet_id', v_target_sheet_id,
    'sheet_name', v_batch.sheet_name,
    'deletion_type', v_batch.deletion_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_deletion_batch(uuid) TO authenticated;

-- 5. Helper: restore one lead out of a batch
CREATE OR REPLACE FUNCTION public.restore_deletion_batch_lead(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid;
  v_sheet_id uuid;
  v_batch public.deletion_batches%ROWTYPE;
  v_remaining int;
BEGIN
  SELECT deletion_batch_id, sheet_id INTO v_batch_id, v_sheet_id
  FROM public.prospects
  WHERE id = p_lead_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
  END IF;

  IF v_batch_id IS NOT NULL THEN
    SELECT * INTO v_batch FROM public.deletion_batches
    WHERE id = v_batch_id AND user_id = auth.uid();

    -- If sheet was soft-deleted, restore (or recreate) it
    IF v_sheet_id IS NOT NULL THEN
      UPDATE public.sheets
         SET deleted_at = NULL, deletion_batch_id = NULL
       WHERE id = v_sheet_id AND user_id = auth.uid()
         AND deleted_at IS NOT NULL;

      IF NOT FOUND AND v_batch.deletion_type = 'sheet' THEN
        INSERT INTO public.sheets (user_id, name)
        VALUES (auth.uid(), COALESCE(v_batch.sheet_name, 'Restored sheet'))
        RETURNING id INTO v_sheet_id;
      END IF;
    END IF;
  END IF;

  UPDATE public.prospects
     SET deleted_at = NULL,
         deletion_batch_id = NULL,
         deletion_type = NULL,
         sheet_id = COALESCE(v_sheet_id, sheet_id)
   WHERE id = p_lead_id AND user_id = auth.uid();

  -- Update or delete the batch record
  IF v_batch_id IS NOT NULL THEN
    SELECT count(*) INTO v_remaining
    FROM public.prospects
    WHERE deletion_batch_id = v_batch_id;

    IF v_remaining = 0 THEN
      DELETE FROM public.deletion_batches WHERE id = v_batch_id;
    ELSE
      UPDATE public.deletion_batches
         SET lead_count = v_remaining
       WHERE id = v_batch_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'sheet_id', v_sheet_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_deletion_batch_lead(uuid) TO authenticated;

-- 6. Helper: permanently delete a batch
CREATE OR REPLACE FUNCTION public.purge_deletion_batch(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.deletion_batches%ROWTYPE;
  v_purged int := 0;
BEGIN
  SELECT * INTO v_batch FROM public.deletion_batches
  WHERE id = p_batch_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'batch_not_found');
  END IF;

  DELETE FROM public.prospects
   WHERE deletion_batch_id = p_batch_id AND user_id = auth.uid();
  GET DIAGNOSTICS v_purged = ROW_COUNT;

  IF v_batch.deletion_type = 'sheet' AND v_batch.sheet_id IS NOT NULL THEN
    DELETE FROM public.sheets
     WHERE id = v_batch.sheet_id
       AND user_id = auth.uid()
       AND deleted_at IS NOT NULL;
  END IF;

  DELETE FROM public.deletion_batches WHERE id = p_batch_id;

  RETURN jsonb_build_object('ok', true, 'purged_count', v_purged);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_deletion_batch(uuid) TO authenticated;

-- 7. Daily auto-purge of items older than 30 days
CREATE OR REPLACE FUNCTION public.purge_expired_deleted_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.prospects
   WHERE deleted_at IS NOT NULL
     AND deleted_at < now() - interval '30 days';

  DELETE FROM public.sheets
   WHERE deleted_at IS NOT NULL
     AND deleted_at < now() - interval '30 days';

  DELETE FROM public.deletion_batches
   WHERE expires_at < now();
END;
$$;

-- Schedule via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-expired-deleted-items')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-deleted-items');

    PERFORM cron.schedule(
      'purge-expired-deleted-items',
      '15 3 * * *',
      $cron$ SELECT public.purge_expired_deleted_items(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
