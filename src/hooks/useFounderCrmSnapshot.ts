/**
 * Founder Mode — Phase 2 live CRM snapshots.
 *
 * Pure derivation over EXISTING data sources (no new Supabase queries):
 *  - Sales  → useGlobalProspects() (app-wide ProspectsProvider) + useTodos()
 *  - Marketing → useFunnels()
 *
 * These feed the small "Live pipeline" / "Live reach" cards shown above the
 * manual status/cadence/checklist/notes UI on the Sales & Marketing functions.
 *
 * Everything is guarded for empty/zero states; nothing here mutates data.
 */
import { useMemo } from 'react';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useTodos } from '@/hooks/useTodos';
import { useFunnels } from '@/hooks/useFunnels';

export interface SalesSnapshot {
  /** Total active (non-deleted) prospects in the pipeline. */
  totalPipeline: number;
  /** Prospects added in the last 7 days (by date_added). */
  addedThisWeek: number;
  /** Incomplete follow-up todos whose due date is today or earlier. */
  followUpsDue: number;
  /** Incomplete follow-up todos already past due (due date before today). */
  followUpsOverdue: number;
  loading: boolean;
}

export interface MarketingSnapshot {
  /** Total leads captured across all funnels (sum of funnel_leads counts). */
  leadsCaptured: number;
  /** Funnels currently published/live. */
  activeFunnels: number;
  /** Total funnels owned (published or not). */
  totalFunnels: number;
  loading: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Derive the Sales pipeline snapshot from the global prospects context and the
 * follow-up todos list.
 *
 * NOTE: `enrolled` / `conversionPct` are intentionally NOT exposed. The global
 * ProspectsContext query does not select `enrollment_status` (see the explicit
 * column list in ProspectsContext.fetchProspects), so deriving enrollment here
 * would always read `undefined` → a misleading 0. We omit it rather than fake a
 * number; it can be added in a later phase once the field is fetched.
 */
export function useSalesSnapshot(): SalesSnapshot {
  const { prospects, loading: prospectsLoading } = useGlobalProspects();
  const { todos, loading: todosLoading } = useTodos();

  return useMemo(() => {
    const list = Array.isArray(prospects) ? prospects : [];
    const todoList = Array.isArray(todos) ? todos : [];

    const now = Date.now();
    const weekAgo = now - 7 * DAY_MS;

    const addedThisWeek = list.filter((p) => {
      if (!p.date_added) return false;
      const t = new Date(p.date_added).getTime();
      return !Number.isNaN(t) && t >= weekAgo;
    }).length;

    // Start of today (local) for the "overdue" boundary.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();
    const endOfTodayMs = startOfTodayMs + DAY_MS;

    let followUpsDue = 0;
    let followUpsOverdue = 0;
    for (const t of todoList) {
      if (t.completed || !t.due_date) continue;
      const due = new Date(t.due_date).getTime();
      if (Number.isNaN(due)) continue;
      // Due = due today or earlier (before end of today).
      if (due < endOfTodayMs) followUpsDue += 1;
      // Overdue = strictly before the start of today.
      if (due < startOfTodayMs) followUpsOverdue += 1;
    }

    return {
      totalPipeline: list.length,
      addedThisWeek,
      followUpsDue,
      followUpsOverdue,
      loading: prospectsLoading || todosLoading,
    };
  }, [prospects, todos, prospectsLoading, todosLoading]);
}

/**
 * Derive the Marketing reach snapshot from the funnels list. Each funnel carries
 * a `leads_count` (count of funnel_leads) and an `is_published` flag.
 *
 * NOTE: `leadsThisMonth` is intentionally omitted. The leads-tracking stats
 * (useLeadsTrackingStats) count `prospects` by IST month, not funnel_leads, so
 * pairing it with "leads captured" here would mix two different lead universes.
 * We surface only cleanly-comparable funnel numbers rather than fake a figure.
 */
export function useMarketingSnapshot(): MarketingSnapshot {
  const { data: funnels, isLoading } = useFunnels();

  return useMemo(() => {
    const list = Array.isArray(funnels) ? funnels : [];

    const leadsCaptured = list.reduce((sum, f) => sum + (f?.leads_count ?? 0), 0);
    const activeFunnels = list.filter((f) => f?.is_published).length;

    return {
      leadsCaptured,
      activeFunnels,
      totalFunnels: list.length,
      loading: isLoading,
    };
  }, [funnels, isLoading]);
}
