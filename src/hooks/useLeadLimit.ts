import { useMemo } from 'react';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdminConfig } from '@/hooks/useAdminConfig';

/** Default free lead limit - overridden by admin config */
const DEFAULT_FREE_LEAD_LIMIT = 500;

/**
 * Hook to check if user has reached the free lead limit.
 * Now reads limits dynamically from admin_usage_limits table.
 */
export function useLeadLimit() {
  const { prospects } = useGlobalProspects();
  const { isPaid, plan } = useSubscription();
  const { config, loading: configLoading } = useAdminConfig();

  const totalLeads = prospects?.length ?? 0;
  
  // Get dynamic limit from admin config
  const freeLeadLimit = config.limits.free_total_leads ?? DEFAULT_FREE_LEAD_LIMIT;
  
  const limitInfo = useMemo(() => {
    // Paid users have no limit
    if (isPaid) {
      return {
        isAtLimit: false,
        canAddLead: true,
        currentCount: totalLeads,
        limit: Infinity,
        remaining: Infinity,
        percentUsed: 0,
      };
    }

    // Free users have dynamic lead limit
    const isAtLimit = totalLeads >= freeLeadLimit;
    const remaining = Math.max(0, freeLeadLimit - totalLeads);
    const percentUsed = Math.min(100, (totalLeads / freeLeadLimit) * 100);

    return {
      isAtLimit,
      canAddLead: !isAtLimit,
      currentCount: totalLeads,
      limit: freeLeadLimit,
      remaining,
      percentUsed,
    };
  }, [totalLeads, isPaid, freeLeadLimit]);

  return {
    ...limitInfo,
    plan,
    isPaid,
    loading: configLoading,
  };
}
