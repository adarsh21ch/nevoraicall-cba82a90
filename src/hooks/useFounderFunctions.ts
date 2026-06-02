import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  FOUNDER_FUNCTIONS,
  getFounderFunction,
  type FounderFunctionKey,
  type FounderFunctionConfig,
  type FounderCadence,
} from '@/config/founderFunctions';

export type FounderFunctionStatus = 'missing' | 'inconsistent' | 'consistent';

/** A persisted founder_functions row (one per user per function). */
export interface FounderFunctionRow {
  id: string;
  user_id: string;
  function_key: FounderFunctionKey;
  status: FounderFunctionStatus;
  cadence: FounderCadence | null;
  notes: string | null;
  checklist: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

/** Config ⨝ row — every function resolves, even with no DB row yet. */
export interface MergedFounderFunction {
  config: FounderFunctionConfig;
  status: FounderFunctionStatus;
  cadence: FounderCadence;
  notes: string;
  checklist: Record<string, boolean>;
  /** How many checklist systems are in place. */
  checklistDone: number;
  checklistTotal: number;
  /** Whether a DB row exists for this function yet. */
  hasRow: boolean;
}

interface UpsertInput {
  function_key: FounderFunctionKey;
  status?: FounderFunctionStatus;
  cadence?: FounderCadence | null;
  notes?: string | null;
  checklist?: Record<string, boolean>;
}

const db = supabase as unknown as { from: (t: string) => any };

/** Merge a function's static config with its (optional) DB row. */
function mergeFunction(config: FounderFunctionConfig, row?: FounderFunctionRow): MergedFounderFunction {
  const checklist = row?.checklist || {};
  const checklistDone = config.systemChecklist.filter((i) => checklist[i.id]).length;
  return {
    config,
    status: row?.status ?? 'missing',
    cadence: (row?.cadence ?? config.defaultCadence) as FounderCadence,
    notes: row?.notes ?? '',
    checklist,
    checklistDone,
    checklistTotal: config.systemChecklist.length,
    hasRow: !!row,
  };
}

export function useFounderFunctions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['founder_functions', user?.id];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<FounderFunctionRow[]> => {
      if (!user) return [];
      const { data, error } = await db
        .from('founder_functions')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []) as FounderFunctionRow[];
    },
    enabled: !!user?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: UpsertInput) => {
      if (!user) throw new Error('Not authenticated');
      const existing = rows.find((r) => r.function_key === input.function_key);
      const payload: Record<string, unknown> = {
        user_id: user.id,
        function_key: input.function_key,
        // preserve existing values when a field isn't being changed
        status: input.status ?? existing?.status ?? 'missing',
        cadence:
          input.cadence !== undefined
            ? input.cadence
            : existing?.cadence ?? getFounderFunction(input.function_key)?.defaultCadence ?? null,
        notes: input.notes !== undefined ? input.notes : existing?.notes ?? null,
        checklist: input.checklist ?? existing?.checklist ?? {},
      };
      const { data, error } = await db
        .from('founder_functions')
        .upsert(payload, { onConflict: 'user_id,function_key' })
        .select()
        .single();
      if (error) throw error;
      return data as FounderFunctionRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder_functions', user?.id] });
    },
    onError: () => toast.error('Could not save changes'),
  });

  const mergedFunctions = useMemo<MergedFounderFunction[]>(() => {
    return FOUNDER_FUNCTIONS.map((config) =>
      mergeFunction(config, rows.find((r) => r.function_key === config.key)),
    );
  }, [rows]);

  return {
    rows,
    isLoading,
    mergedFunctions,
    upsertFunction: upsertMutation.mutateAsync,
    saving: upsertMutation.isPending,
    isPending: upsertMutation.isPending,
  };
}

/**
 * Convenience selector that resolves a single function (config ⨝ row), falling
 * back to defaults so an untouched function still renders sensibly.
 */
export function useFounderFunction(key: FounderFunctionKey) {
  const { rows, isLoading, upsertFunction, saving } = useFounderFunctions();
  const config = getFounderFunction(key);
  const merged = useMemo<MergedFounderFunction | null>(() => {
    if (!config) return null;
    return mergeFunction(config, rows.find((r) => r.function_key === key));
  }, [config, rows, key]);

  return { merged, isLoading, upsertFunction, saving };
}
