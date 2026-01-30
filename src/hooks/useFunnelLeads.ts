import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FunnelLead, FunnelLeadStats } from '@/types/funnels';

export function useFunnelLeads(funnelId: string | undefined, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['funnel-leads', funnelId, limit, offset],
    queryFn: async () => {
      if (!funnelId) return { leads: [], total: 0 };

      const { data, error, count } = await supabase
        .from('funnel_leads')
        .select('*', { count: 'exact' })
        .eq('funnel_id', funnelId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        leads: (data || []) as FunnelLead[],
        total: count || 0,
      };
    },
    enabled: !!funnelId,
  });
}

export function useFunnelLeadStats(funnelId: string | undefined) {
  return useQuery({
    queryKey: ['funnel-lead-stats', funnelId],
    queryFn: async (): Promise<FunnelLeadStats> => {
      if (!funnelId) {
        return {
          totalLeads: 0,
          completedVideo: 0,
          completionRate: 0,
          paidLeads: 0,
          paymentConversionRate: 0,
        };
      }

      // Get total leads count
      const { count: totalLeads, error: countError } = await supabase
        .from('funnel_leads')
        .select('*', { count: 'exact', head: true })
        .eq('funnel_id', funnelId);

      if (countError) throw countError;

      // Get completed video count
      const { count: completedVideo, error: completedError } = await supabase
        .from('funnel_leads')
        .select('*', { count: 'exact', head: true })
        .eq('funnel_id', funnelId)
        .eq('video_completed', true);

      if (completedError) throw completedError;

      // Get paid leads count
      const { count: paidLeads, error: paidError } = await supabase
        .from('funnel_leads')
        .select('*', { count: 'exact', head: true })
        .eq('funnel_id', funnelId)
        .eq('payment_status_cache', 'paid');

      if (paidError) throw paidError;

      const total = totalLeads || 0;
      const completed = completedVideo || 0;
      const paid = paidLeads || 0;

      return {
        totalLeads: total,
        completedVideo: completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        paidLeads: paid,
        paymentConversionRate: total > 0 ? Math.round((paid / total) * 100) : 0,
      };
    },
    enabled: !!funnelId,
  });
}
