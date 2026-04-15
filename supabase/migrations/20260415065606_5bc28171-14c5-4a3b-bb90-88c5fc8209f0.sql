-- 1. Fix admin_config_text: restrict sensitive keys
DROP POLICY IF EXISTS "Anyone can read admin_config_text" ON public.admin_config_text;

CREATE POLICY "Public can read non-sensitive config"
ON public.admin_config_text
FOR SELECT
USING (config_key NOT IN ('vapid_private_key'));

-- 2. Fix funnel_video_sessions: remove overly permissive policies
DROP POLICY IF EXISTS "Allow tracking inserts" ON public.funnel_video_sessions;
DROP POLICY IF EXISTS "Allow tracking select" ON public.funnel_video_sessions;
DROP POLICY IF EXISTS "Allow tracking updates" ON public.funnel_video_sessions;

-- Allow anonymous inserts (needed for public funnel viewers)
CREATE POLICY "Allow tracking inserts for published funnels"
ON public.funnel_video_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM funnels f
    WHERE f.id = funnel_video_sessions.funnel_id
    AND f.is_published = true
  )
);

-- Allow viewers to read only their own session by viewer_token
CREATE POLICY "Viewers can read own session"
ON public.funnel_video_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM funnels f
    WHERE f.id = funnel_video_sessions.funnel_id
    AND f.owner_user_id = auth.uid()
  )
  OR viewer_token = current_setting('request.headers', true)::json->>'x-viewer-token'
);

-- Allow updates only for own viewer session
CREATE POLICY "Allow tracking updates for own session"
ON public.funnel_video_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM funnels f
    WHERE f.id = funnel_video_sessions.funnel_id
    AND f.owner_user_id = auth.uid()
  )
  OR viewer_token = current_setting('request.headers', true)::json->>'x-viewer-token'
);

-- 3. Fix course_coupons: restrict management to course owners
DROP POLICY IF EXISTS "Authenticated can manage coupons" ON public.course_coupons;

CREATE POLICY "Course owners can manage coupons"
ON public.course_coupons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_coupons.course_id
    AND courses.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_coupons.course_id
    AND courses.owner_user_id = auth.uid()
  )
);

-- 4. Fix course_enrollments: restrict to own records or course owners
DROP POLICY IF EXISTS "Anyone can read own enrollment" ON public.course_enrollments;
DROP POLICY IF EXISTS "Anyone can update own enrollment" ON public.course_enrollments;

CREATE POLICY "Users can read own enrollment"
ON public.course_enrollments
FOR SELECT
USING (
  user_identifier = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_enrollments.course_id
    AND courses.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own enrollment"
ON public.course_enrollments
FOR UPDATE
USING (
  user_identifier = auth.uid()::text
  OR EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = course_enrollments.course_id
    AND courses.owner_user_id = auth.uid()
  )
);