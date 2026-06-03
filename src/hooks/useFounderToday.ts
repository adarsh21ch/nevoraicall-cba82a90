/**
 * Founder Mode — "Today" daily cockpit aggregation.
 *
 * Composes EXISTING hooks (no new Supabase queries, no mock data) into the data
 * the Manage home renders:
 *  - Business health score (avg of the 7 founder-function statuses).
 *  - Today's focus list (overdue/due todos, unmarked daily tasks, functions due
 *    for review today per their cadence), sorted overdue-first.
 *  - Live numbers (pipeline, new leads this week, leads captured, follow-ups due).
 *  - Per-function review-due flags for the functions grid.
 *
 * All date math uses LOCAL day boundaries. Everything is guarded for empty
 * states; nothing here mutates data.
 */
import { useMemo } from 'react';
import { format } from 'date-fns';
import { useFounderFunctions, type MergedFounderFunction } from '@/hooks/useFounderFunctions';
import { useSalesSnapshot, useMarketingSnapshot } from '@/hooks/useFounderCrmSnapshot';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useTodos } from '@/hooks/useTodos';
import { useUserDailyTasks } from '@/hooks/useUserDailyTasks';
import type { FounderCadence, FounderFunctionKey } from '@/config/founderFunctions';
import type { Todo } from '@/types/prospect';

const DAY_MS = 24 * 60 * 60 * 1000;

export type FocusKind = 'overdue' | 'due_today' | 'daily_task' | 'function_review';

export interface FocusItem {
  id: string;
  kind: FocusKind;
  label: string;
  /** Optional secondary line. */
  sublabel?: string;
  /** Where tapping the item navigates. */
  href: string;
  /** Sort weight — lower surfaces first (overdue first). */
  weight: number;
}

const KIND_WEIGHT: Record<FocusKind, number> = {
  overdue: 0,
  due_today: 1,
  daily_task: 2,
  function_review: 3,
};

/** Is a function due for review on `date` given its cadence? Local-day based. */
export function isFunctionDueToday(cadence: FounderCadence, date: Date): boolean {
  switch (cadence) {
    case 'daily':
      return true;
    case 'weekly':
      return date.getDay() === 1; // Monday
    case 'monthly':
      return date.getDate() === 1;
    case 'quarterly': {
      const m = date.getMonth(); // 0-indexed: Jan/Apr/Jul/Oct => 0,3,6,9
      return date.getDate() === 1 && m % 3 === 0;
    }
    case 'once':
    default:
      return false;
  }
}

const CADENCE_REVIEW_LABEL: Record<FounderCadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  once: 'One-time',
};

export interface FounderTodayData {
  /** 0–100 business-health score (consistent=100, inconsistent=50, missing=0). */
  healthScore: number;
  healthCounts: { consistent: number; inconsistent: number; missing: number };
  /** Prioritized focus list, overdue-first. */
  focus: FocusItem[];
  /** Per-function-key: due for review today? */
  reviewDue: Record<FounderFunctionKey, boolean>;
  /** Live numbers. */
  numbers: {
    pipeline: number;
    newLeadsThisWeek: number;
    leadsCaptured: number;
    followUpsDue: number;
  };
  /** Loading flags per concern (so the UI can spin granularly). */
  loading: {
    functions: boolean;
    sales: boolean;
    marketing: boolean;
    dailyTasks: boolean;
  };
  mergedFunctions: MergedFounderFunction[];
  /** Per-function-key: ISO updated_at of its DB row, if any. */
  updatedAt: Partial<Record<FounderFunctionKey, string>>;
}

const STATUS_SCORE: Record<MergedFounderFunction['status'], number> = {
  consistent: 100,
  inconsistent: 50,
  missing: 0,
};

export function useFounderToday(): FounderTodayData {
  const { mergedFunctions, rows, isLoading: functionsLoading } = useFounderFunctions();
  const sales = useSalesSnapshot();
  const marketing = useMarketingSnapshot();
  const { prospects } = useGlobalProspects();
  const { todos } = useTodos();

  // "Today" as a local YYYY-MM-DD string, matching how the To-Do screen keys
  // daily-task statuses (date-fns format, local).
  const todayString = format(new Date(), 'yyyy-MM-dd');
  const { tasks: dailyTasks, loading: dailyTasksLoading } = useUserDailyTasks(todayString);

  const healthScore = useMemo(() => {
    if (mergedFunctions.length === 0) return 0;
    const total = mergedFunctions.reduce((s, f) => s + STATUS_SCORE[f.status], 0);
    return Math.round(total / mergedFunctions.length);
  }, [mergedFunctions]);

  const healthCounts = useMemo(() => {
    const c = { consistent: 0, inconsistent: 0, missing: 0 };
    mergedFunctions.forEach((f) => { c[f.status] += 1; });
    return c;
  }, [mergedFunctions]);

  const reviewDue = useMemo(() => {
    const now = new Date();
    const map = {} as Record<FounderFunctionKey, boolean>;
    mergedFunctions.forEach((f) => {
      map[f.config.key] = isFunctionDueToday(f.cadence, now);
    });
    return map;
  }, [mergedFunctions]);

  const focus = useMemo<FocusItem[]>(() => {
    const items: FocusItem[] = [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();
    const endOfTodayMs = startOfTodayMs + DAY_MS;

    const todoList: Todo[] = Array.isArray(todos) ? todos : [];
    for (const t of todoList) {
      if (t.completed || !t.due_date) continue;
      const due = new Date(t.due_date).getTime();
      if (Number.isNaN(due)) continue;
      if (due < startOfTodayMs) {
        items.push({
          id: `todo-${t.id}`,
          kind: 'overdue',
          label: t.title,
          sublabel: 'Overdue follow-up',
          href: '/action',
          weight: KIND_WEIGHT.overdue,
        });
      } else if (due < endOfTodayMs) {
        items.push({
          id: `todo-${t.id}`,
          kind: 'due_today',
          label: t.title,
          sublabel: 'Due today',
          href: '/action',
          weight: KIND_WEIGHT.due_today,
        });
      }
    }

    // Daily tasks not yet marked today (status === null).
    const unmarked = (dailyTasks || []).filter((d) => d.status == null);
    for (const d of unmarked) {
      items.push({
        id: `daily-${d.id}`,
        kind: 'daily_task',
        label: d.title,
        sublabel: 'Daily task — not marked yet',
        href: '/action',
        weight: KIND_WEIGHT.daily_task,
      });
    }

    // Functions due for review today (per cadence).
    const now = new Date();
    for (const f of mergedFunctions) {
      if (f.cadence === 'once') continue;
      if (!isFunctionDueToday(f.cadence, now)) continue;
      items.push({
        id: `fn-${f.config.key}`,
        kind: 'function_review',
        label: `${CADENCE_REVIEW_LABEL[f.cadence]} ${f.config.label} review due`,
        sublabel: 'Review this function',
        href: `/manage/${f.config.key}`,
        weight: KIND_WEIGHT.function_review,
      });
    }

    return items.sort((a, b) => a.weight - b.weight);
  }, [todos, dailyTasks, mergedFunctions]);

  const numbers = useMemo(() => {
    const list = Array.isArray(prospects) ? prospects : [];
    return {
      pipeline: list.length,
      newLeadsThisWeek: sales.addedThisWeek,
      leadsCaptured: marketing.leadsCaptured,
      followUpsDue: sales.followUpsDue,
    };
  }, [prospects, sales.addedThisWeek, sales.followUpsDue, marketing.leadsCaptured]);

  const updatedAt = useMemo(() => {
    const map: Partial<Record<FounderFunctionKey, string>> = {};
    (rows || []).forEach((r) => {
      if (r.updated_at) map[r.function_key] = r.updated_at;
    });
    return map;
  }, [rows]);

  return {
    healthScore,
    healthCounts,
    focus,
    reviewDue,
    numbers,
    loading: {
      functions: functionsLoading,
      sales: sales.loading,
      marketing: marketing.loading,
      dailyTasks: dailyTasksLoading,
    },
    mergedFunctions,
    updatedAt,
  };
}
