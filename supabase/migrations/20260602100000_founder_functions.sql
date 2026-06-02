-- ============================================================================
-- Founder Mode — business cockpit (Phase 1)
-- One row per user per business function (management, marketing, sales,
-- operations, accounts, legal, hr). Tracks the function's maturity status, a
-- review cadence, free-form notes, and which of its system/SOP checklist items
-- are in place. UPSERT keyed on (user_id, function_key).
-- RLS-scoped to the owner (auth.uid() = user_id), mirroring the creator tables.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.founder_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_key text NOT NULL,
  status text NOT NULL DEFAULT 'missing',   -- missing | inconsistent | consistent
  cadence text,                             -- daily | weekly | monthly | quarterly | once
  notes text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { checklistItemId: true } for done systems
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founder_functions_status_check CHECK (status IN ('missing','inconsistent','consistent')),
  CONSTRAINT founder_functions_user_function_unique UNIQUE (user_id, function_key)
);
CREATE INDEX IF NOT EXISTS founder_functions_user_id_idx ON public.founder_functions(user_id);

-- ── updated_at trigger (reuse existing fn) ──────────────────────────────────
DROP TRIGGER IF EXISTS set_founder_functions_updated_at ON public.founder_functions;
CREATE TRIGGER set_founder_functions_updated_at
  BEFORE UPDATE ON public.founder_functions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS: scoped to owner ────────────────────────────────────────────────────
ALTER TABLE public.founder_functions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own founder_functions"   ON public.founder_functions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own founder_functions" ON public.founder_functions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own founder_functions" ON public.founder_functions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own founder_functions" ON public.founder_functions FOR DELETE USING (auth.uid() = user_id);
