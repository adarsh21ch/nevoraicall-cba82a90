import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DeletionBatch {
  id: string;
  user_id: string;
  deleted_at: string;
  deletion_type: 'single' | 'bulk' | 'sheet';
  sheet_id: string | null;
  sheet_name: string | null;
  lead_count: number;
  preview_name: string | null;
  preview_phone: string | null;
  expires_at: string;
}

export interface BatchLead {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  sheet_id: string | null;
  deleted_at: string;
}

export function useDeletionBatches() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['deletion-batches', user?.id];

  const { data: batches = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<DeletionBatch[]> => {
      if (!user) return [];
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('deletion_batches')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', nowIso) // hide expired batches
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DeletionBatch[];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['sheets', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['prospects', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['prospects-kpi', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['deleted-prospects', user?.id] });
  }, [queryClient, queryKey, user?.id]);

  const restoreMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase.rpc('restore_deletion_batch', {
        p_batch_id: batchId,
      });
      if (error) throw error;
      return data as { ok: boolean; restored_count?: number; sheet_name?: string; deletion_type?: string };
    },
    onSuccess: (res) => {
      invalidateAll();
      if (res?.ok) {
        if (res.deletion_type === 'sheet') {
          toast.success(`"${res.sheet_name ?? 'Sheet'}" restored with ${res.restored_count ?? 0} leads`);
        } else if ((res.restored_count ?? 0) > 1) {
          toast.success(`${res.restored_count} leads restored${res.sheet_name ? ` to ${res.sheet_name}` : ''}`);
        } else {
          toast.success('Lead restored');
        }
      }
    },
    onError: () => toast.error('Failed to restore'),
  });

  const restoreLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc('restore_deletion_batch_lead', {
        p_lead_id: leadId,
      });
      if (error) throw error;
      return data as { ok: boolean };
    },
    onSuccess: (res) => {
      invalidateAll();
      if (res?.ok) toast.success('Lead restored');
    },
    onError: () => toast.error('Failed to restore lead'),
  });

  const purgeMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const { data, error } = await supabase.rpc('purge_deletion_batch', {
        p_batch_id: batchId,
      });
      if (error) throw error;
      return data as { ok: boolean; purged_count?: number };
    },
    onSuccess: (res) => {
      invalidateAll();
      if (res?.ok) toast.success(`Permanently deleted ${res.purged_count ?? 0} item(s)`);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const purgeAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      // Sequentially purge each batch via the RPC for correctness
      for (const b of batches) {
        await supabase.rpc('purge_deletion_batch', { p_batch_id: b.id });
      }
      return batches.length;
    },
    onSuccess: (count) => {
      invalidateAll();
      toast.success(`Cleared ${count} item(s) from Recently Deleted`);
    },
    onError: () => toast.error('Failed to clear all'),
  });

  const fetchBatchLeads = useCallback(
    async (batchId: string): Promise<BatchLead[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('prospects')
        .select('id, name, phone, address, sheet_id, deleted_at')
        .eq('user_id', user.id)
        .eq('deletion_batch_id', batchId)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BatchLead[];
    },
    [user]
  );

  return {
    batches,
    loading,
    refetch,
    fetchBatchLeads,
    restoreBatch: (id: string) => restoreMutation.mutateAsync(id),
    restoreLead: (id: string) => restoreLeadMutation.mutateAsync(id),
    purgeBatch: (id: string) => purgeMutation.mutateAsync(id),
    purgeAll: () => purgeAllMutation.mutateAsync(),
    isRestoring: restoreMutation.isPending || restoreLeadMutation.isPending,
    isPurging: purgeMutation.isPending || purgeAllMutation.isPending,
  };
}
