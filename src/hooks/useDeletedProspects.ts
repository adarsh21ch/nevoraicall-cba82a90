import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Prospect, mapOldStatusToNew } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEncryption } from '@/hooks/useEncryption';

// Map database prospect to app prospect
const mapDbProspect = (dbProspect: any): Prospect => ({
  ...dbProspect,
  prospect_status: mapOldStatusToNew(dbProspect.prospect_status),
});

export function useDeletedProspects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { decryptBatch, encryptFields } = useEncryption();
  
  const queryKey = ['deleted-prospects', user?.id];

  const { data: deletedProspects = [], isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<Prospect[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('prospects')
        .select('id, name, phone, address, age_or_dob, gender, instagram, profession, why_need, notes, funnel_stage, action_taken, prospect_status, priority, personal_tags, sheet_id, batch_date, date_added, updated_at, sort_order, deleted_at')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) {
        console.error('Error fetching deleted prospects:', error);
        throw error;
      }

      const decryptedData = await decryptBatch(data || []);
      return decryptedData.map(mapDbProspect);
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });

  // Restore a single prospect (clear deleted_at)
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prospects')
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect restored');
    },
    onError: () => {
      toast.error('Failed to restore prospect');
    },
  });

  // Restore all deleted prospects
  const restoreAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      
      const { error } = await supabase
        .from('prospects')
        .update({ deleted_at: null })
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (error) throw error;
      return deletedProspects.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success(`${count} prospect(s) restored`);
    },
    onError: () => {
      toast.error('Failed to restore prospects');
    },
  });

  // Permanently delete a prospect
  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Permanently deleted');
    },
    onError: () => {
      toast.error('Failed to delete');
    },
  });

  // Permanently delete all deleted prospects
  const permanentDeleteAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      
      const { error } = await supabase
        .from('prospects')
        .delete()
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (error) throw error;
      return deletedProspects.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(`${count} prospect(s) permanently deleted`);
    },
    onError: () => {
      toast.error('Failed to delete');
    },
  });

  const restore = useCallback(async (id: string) => {
    await restoreMutation.mutateAsync(id);
  }, [restoreMutation]);

  const restoreAll = useCallback(async () => {
    await restoreAllMutation.mutateAsync();
  }, [restoreAllMutation]);

  const permanentDelete = useCallback(async (id: string) => {
    await permanentDeleteMutation.mutateAsync(id);
  }, [permanentDeleteMutation]);

  const permanentDeleteAll = useCallback(async () => {
    await permanentDeleteAllMutation.mutateAsync();
  }, [permanentDeleteAllMutation]);

  return {
    deletedProspects,
    loading,
    count: deletedProspects.length,
    restore,
    restoreAll,
    permanentDelete,
    permanentDeleteAll,
    refetch,
    isRestoring: restoreMutation.isPending || restoreAllMutation.isPending,
    isDeleting: permanentDeleteMutation.isPending || permanentDeleteAllMutation.isPending,
  };
}
