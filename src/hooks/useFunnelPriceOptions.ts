import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FunnelPriceOption {
  id: string;
  funnel_id: string;
  label: string;
  amount: number;
  upi_id: string | null;
  qr_image_url: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePriceOptionInput {
  funnel_id: string;
  label: string;
  amount: number;
  upi_id?: string;
  qr_image_url?: string;
  is_default?: boolean;
}

export interface UpdatePriceOptionInput {
  id: string;
  label?: string;
  amount?: number;
  upi_id?: string;
  qr_image_url?: string;
  is_default?: boolean;
  sort_order?: number;
}

export function useFunnelPriceOptions(funnelId: string | undefined) {
  return useQuery({
    queryKey: ['funnel-price-options', funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      
      const { data, error } = await supabase
        .from('funnel_price_options')
        .select('*')
        .eq('funnel_id', funnelId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FunnelPriceOption[];
    },
    enabled: !!funnelId,
  });
}

export function useCreatePriceOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePriceOptionInput) => {
      // Get current max sort_order
      const { data: existing } = await supabase
        .from('funnel_price_options')
        .select('sort_order')
        .eq('funnel_id', input.funnel_id)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextSortOrder = existing && existing.length > 0 
        ? (existing[0].sort_order || 0) + 1 
        : 0;

      // If this is marked as default, unset other defaults
      if (input.is_default) {
        await supabase
          .from('funnel_price_options')
          .update({ is_default: false })
          .eq('funnel_id', input.funnel_id);
      }

      const { data, error } = await supabase
        .from('funnel_price_options')
        .insert({
          funnel_id: input.funnel_id,
          label: input.label,
          amount: input.amount,
          upi_id: input.upi_id || null,
          qr_image_url: input.qr_image_url || null,
          is_default: input.is_default || false,
          sort_order: nextSortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FunnelPriceOption;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-price-options', data.funnel_id] });
      toast.success('Price option added');
    },
    onError: (error) => {
      console.error('Failed to create price option:', error);
      toast.error('Failed to add price option');
    },
  });
}

export function useUpdatePriceOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePriceOptionInput) => {
      const { id, ...updates } = input;

      // Get the funnel_id first
      const { data: option } = await supabase
        .from('funnel_price_options')
        .select('funnel_id')
        .eq('id', id)
        .single();

      if (!option) throw new Error('Price option not found');

      // If setting as default, unset other defaults
      if (updates.is_default) {
        await supabase
          .from('funnel_price_options')
          .update({ is_default: false })
          .eq('funnel_id', option.funnel_id)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('funnel_price_options')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as FunnelPriceOption;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-price-options', data.funnel_id] });
      toast.success('Price option updated');
    },
    onError: (error) => {
      console.error('Failed to update price option:', error);
      toast.error('Failed to update price option');
    },
  });
}

export function useDeletePriceOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get funnel_id before deleting
      const { data: option } = await supabase
        .from('funnel_price_options')
        .select('funnel_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('funnel_price_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return option?.funnel_id;
    },
    onSuccess: (funnelId) => {
      if (funnelId) {
        queryClient.invalidateQueries({ queryKey: ['funnel-price-options', funnelId] });
      }
      toast.success('Price option deleted');
    },
    onError: (error) => {
      console.error('Failed to delete price option:', error);
      toast.error('Failed to delete price option');
    },
  });
}

export function useReorderPriceOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ funnelId, options }: { funnelId: string; options: { id: string; sort_order: number }[] }) => {
      const updates = options.map(opt => 
        supabase
          .from('funnel_price_options')
          .update({ sort_order: opt.sort_order })
          .eq('id', opt.id)
      );

      await Promise.all(updates);
      return funnelId;
    },
    onSuccess: (funnelId) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-price-options', funnelId] });
    },
    onError: (error) => {
      console.error('Failed to reorder price options:', error);
      toast.error('Failed to reorder options');
    },
  });
}
