
DROP POLICY IF EXISTS "Authenticated users can read video assets" ON public.video_assets;
DROP POLICY IF EXISTS "Users can view owned or shared videos" ON public.video_assets;
DROP POLICY IF EXISTS "Owners can manage video assets" ON public.video_assets;

CREATE POLICY "video_assets_select"
ON public.video_assets FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.video_assets_access
    WHERE video_assets_access.video_asset_id = video_assets.id
      AND video_assets_access.user_id = auth.uid()
      AND video_assets_access.revoked_at IS NULL
  )
);

CREATE POLICY "video_assets_owner_insert"
ON public.video_assets FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "video_assets_owner_update"
ON public.video_assets FOR UPDATE
USING (owner_user_id = auth.uid());

CREATE POLICY "video_assets_owner_delete"
ON public.video_assets FOR DELETE
USING (owner_user_id = auth.uid());
