import { useMemo, useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Default free tier limit - overridden by admin config */
export const FREE_LIFETIME_LEAD_LIMIT = 200;
/** Default warning threshold - overridden by admin config */
export const LEAD_WARNING_THRESHOLD = 190;

/**
 * Hook to check lifetime lead limits for free users.
 * Now reads limits dynamically from admin_usage_limits table.
 */
export function useLifetimeLeadLimit() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, refetch: refetchProfile } = useProfile();
  const { isPaid, plan, loading: subLoading } = useSubscription();
  const { config, loading: configLoading } = useAdminConfig();

  const totalLeadsAdded = profile?.total_leads_added ?? 0;
  const isLoading = profileLoading || subLoading || configLoading;

  // Get dynamic limits from admin config
  const freeLimit = config.limits.free_total_leads ?? FREE_LIFETIME_LEAD_LIMIT;
  const warningThreshold = config.limits.warning_threshold_3 ?? LEAD_WARNING_THRESHOLD;

  const limitInfo = useMemo(() => {
    // Paid users have no limit
    if (isPaid) {
      return {
        isAtLimit: false,
        isNearLimit: false,
        canAddLead: true,
        canAddLeads: (count: number) => true,
        lifetimeCount: totalLeadsAdded,
        limit: Infinity,
        remaining: Infinity,
        percentUsed: 0,
        showWarning: false,
      };
    }

    // Free users have lifetime limit from admin config
    const isAtLimit = totalLeadsAdded >= freeLimit;
    const isNearLimit = totalLeadsAdded >= warningThreshold;
    const remaining = Math.max(0, freeLimit - totalLeadsAdded);
    const percentUsed = Math.min(100, (totalLeadsAdded / freeLimit) * 100);

    return {
      isAtLimit,
      isNearLimit,
      canAddLead: !isAtLimit,
      canAddLeads: (count: number) => totalLeadsAdded + count <= freeLimit,
      lifetimeCount: totalLeadsAdded,
      limit: freeLimit,
      remaining,
      percentUsed,
      showWarning: isNearLimit && !isPaid,
    };
  }, [totalLeadsAdded, isPaid, freeLimit, warningThreshold]);

  /**
   * Increment the lifetime lead counter after adding leads.
   * This should be called after successfully adding leads.
   */
  const incrementLeadCount = useCallback(async (count: number = 1): Promise<number | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .rpc('increment_leads_added', { 
          user_uuid: user.id, 
          count 
        });
      
      if (error) {
        console.error('Error incrementing lead count:', error);
        return null;
      }
      
      // Refetch profile to update the local state
      refetchProfile?.();
      
      return data;
    } catch (err) {
      console.error('Failed to increment lead count:', err);
      return null;
    }
  }, [user, refetchProfile]);

  return {
    ...limitInfo,
    plan,
    isPaid,
    isLoading,
    incrementLeadCount,
    // Expose the dynamic limits for reference
    configuredLimit: freeLimit,
    configuredWarningThreshold: warningThreshold,
  };
}
