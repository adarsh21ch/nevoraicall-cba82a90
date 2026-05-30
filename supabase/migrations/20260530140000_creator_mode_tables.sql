-- ============================================================================
-- Content Creator Mode — backend tables (Modes Step 5)
-- Spec: docs/modes/content-creator-mode.md §6.
-- All tables RLS-scoped to user_id (auth.uid() = user_id), mirroring the
-- network-marketing tables (prospects / todos / sheets).
-- ============================================================================

-- ── content_ideas ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  hook text,
  hook_type text,                          -- story | contrarian | listicle | question | visual
  source text NOT NULL DEFAULT 'self',     -- self | ai | competitor
  status text NOT NULL DEFAULT 'spark',    -- spark | developing | scripted | done
  niche_tag text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_ideas_source_check CHECK (source IN ('self','ai','competitor')),
  CONSTRAINT content_ideas_status_check CHECK (status IN ('spark','developing','scripted','done'))
);
CREATE INDEX IF NOT EXISTS content_ideas_user_id_idx ON public.content_ideas(user_id);

-- ── content_pieces ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id uuid REFERENCES public.content_ideas(id) ON DELETE SET NULL,
  script text,
  caption text,
  hashtags text[] NOT NULL DEFAULT '{}',
  platform text NOT NULL DEFAULT 'reels',  -- reels | youtube | x | linkedin
  stage text NOT NULL DEFAULT 'idea',      -- idea | scripting | filming | editing | scheduled | posted
  scheduled_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_pieces_stage_check CHECK (stage IN ('idea','scripting','filming','editing','scheduled','posted'))
);
CREATE INDEX IF NOT EXISTS content_pieces_user_id_idx ON public.content_pieces(user_id);
CREATE INDEX IF NOT EXISTS content_pieces_idea_id_idx ON public.content_pieces(idea_id);

-- ── content_metrics ────────────────────────────────────────────────────────
-- One row per post's measured performance. `source` = which input tier filled it.
CREATE TABLE IF NOT EXISTS public.content_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  piece_id uuid NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
  hook_rate numeric,        -- 3-sec hold-rate %
  watch_pct numeric,        -- % watched
  avg_watch_s numeric,      -- avg watch time (seconds)
  saves integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  sends integer NOT NULL DEFAULT 0,
  comments integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  nev_score numeric,
  source text NOT NULL DEFAULT 'manual',   -- manual | screenshot | api
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_metrics_source_check CHECK (source IN ('manual','screenshot','api'))
);
CREATE INDEX IF NOT EXISTS content_metrics_user_id_idx ON public.content_metrics(user_id);
CREATE INDEX IF NOT EXISTS content_metrics_piece_id_idx ON public.content_metrics(piece_id);

-- ── competitors ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  niche text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT competitors_unique UNIQUE (user_id, platform, handle)
);
CREATE INDEX IF NOT EXISTS competitors_user_id_idx ON public.competitors(user_id);

-- ── competitor_posts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.competitor_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  url text,
  hook text,
  topic text,
  metrics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS competitor_posts_user_id_idx ON public.competitor_posts(user_id);
CREATE INDEX IF NOT EXISTS competitor_posts_competitor_id_idx ON public.competitor_posts(competitor_id);

-- ── ai_training_signals ────────────────────────────────────────────────────
-- Derived "this creator's winning patterns" — injected into Nev AI prompts.
CREATE TABLE IF NOT EXISTS public.ai_training_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern text NOT NULL,
  evidence_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_training_signals_user_id_idx ON public.ai_training_signals(user_id);

-- ── updated_at triggers (reuse existing fn) ────────────────────────────────
DROP TRIGGER IF EXISTS set_content_ideas_updated_at ON public.content_ideas;
CREATE TRIGGER set_content_ideas_updated_at
  BEFORE UPDATE ON public.content_ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_content_pieces_updated_at ON public.content_pieces;
CREATE TRIGGER set_content_pieces_updated_at
  BEFORE UPDATE ON public.content_pieces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_ai_training_signals_updated_at ON public.ai_training_signals;
CREATE TRIGGER set_ai_training_signals_updated_at
  BEFORE UPDATE ON public.ai_training_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS: every table scoped to its owner ───────────────────────────────────
ALTER TABLE public.content_ideas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pieces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_metrics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_signals  ENABLE ROW LEVEL SECURITY;

-- content_ideas
CREATE POLICY "Users view own content_ideas"   ON public.content_ideas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own content_ideas" ON public.content_ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own content_ideas" ON public.content_ideas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own content_ideas" ON public.content_ideas FOR DELETE USING (auth.uid() = user_id);

-- content_pieces
CREATE POLICY "Users view own content_pieces"   ON public.content_pieces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own content_pieces" ON public.content_pieces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own content_pieces" ON public.content_pieces FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own content_pieces" ON public.content_pieces FOR DELETE USING (auth.uid() = user_id);

-- content_metrics
CREATE POLICY "Users view own content_metrics"   ON public.content_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own content_metrics" ON public.content_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own content_metrics" ON public.content_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own content_metrics" ON public.content_metrics FOR DELETE USING (auth.uid() = user_id);

-- competitors
CREATE POLICY "Users view own competitors"   ON public.competitors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own competitors" ON public.competitors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own competitors" ON public.competitors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own competitors" ON public.competitors FOR DELETE USING (auth.uid() = user_id);

-- competitor_posts
CREATE POLICY "Users view own competitor_posts"   ON public.competitor_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own competitor_posts" ON public.competitor_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own competitor_posts" ON public.competitor_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own competitor_posts" ON public.competitor_posts FOR DELETE USING (auth.uid() = user_id);

-- ai_training_signals
CREATE POLICY "Users view own ai_training_signals"   ON public.ai_training_signals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai_training_signals" ON public.ai_training_signals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ai_training_signals" ON public.ai_training_signals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own ai_training_signals" ON public.ai_training_signals FOR DELETE USING (auth.uid() = user_id);
