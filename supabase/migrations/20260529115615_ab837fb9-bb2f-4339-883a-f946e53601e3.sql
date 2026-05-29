-- 1) Courses: hide upi_id / qr_image_url from public reads
DROP POLICY IF EXISTS "Anyone can read published courses" ON public.courses;

CREATE OR REPLACE VIEW public.courses_public
WITH (security_invoker = true) AS
SELECT
  id,
  owner_user_id,
  title,
  description,
  thumbnail_url,
  price,
  is_published,
  created_at,
  updated_at
FROM public.courses
WHERE is_published = true;

GRANT SELECT ON public.courses_public TO anon, authenticated;

-- Re-add owner-scoped SELECT (the ALL policy already covers owners, but keep clean separation)
CREATE POLICY "Owners can read their own courses"
  ON public.courses FOR SELECT
  USING (owner_user_id = auth.uid());

-- 2) Payment-proofs bucket: make private and remove permissive public policies
UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';
DROP POLICY IF EXISTS "Anyone can read payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON storage.objects;

-- 3) Funnel analytics: remove unscoped client inserts. Edge functions (service role) bypass RLS.
DROP POLICY IF EXISTS "Anyone can insert view analytics" ON public.funnel_view_analytics;
DROP POLICY IF EXISTS "Insert analytics for valid leads" ON public.funnel_video_analytics;

-- 4) Communities: replace open SELECT with slug-availability RPC
DROP POLICY IF EXISTS "Authenticated can check slug availability" ON public.communities;

CREATE OR REPLACE FUNCTION public.community_slug_exists(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.communities WHERE slug = p_slug);
$$;

REVOKE ALL ON FUNCTION public.community_slug_exists(text) FROM public;
GRANT EXECUTE ON FUNCTION public.community_slug_exists(text) TO anon, authenticated;

-- 5) Ensure public views run as invoker (Postgres SECURITY DEFINER VIEW lint)
ALTER VIEW public.funnels_public SET (security_invoker = true);
ALTER VIEW public.funnel_price_options_public SET (security_invoker = true);