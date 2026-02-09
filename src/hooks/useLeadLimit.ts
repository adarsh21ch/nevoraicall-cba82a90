import { useMemo } from 'react';
import { useGlobalProspects } from '@/contexts/ProspectsContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

/**
 * Hook to check if user has reached the free lead limit.
 * Now reads limits from the Feature Registry via useFeatureAccess.
 */
export function useLeadLimit() {
  const { prospects } = useGlobalProspects();
  const { canAccess, limit, isLoading } = useFeatureAccess('total_lead_limit');

  const totalLeads = prospects?.length ?? 0;
  const freeLeadLimit = limit ?? Infinity; // null = unlimited

  const limitInfo = useMemo(() => {
    // If no limit (paid/unlimited), no restriction
    if (freeLeadLimit === Infinity || limit === null) {
      return {
        isAtLimit: false,
        canAddLead: true,
        currentCount: totalLeads,
        limit: Infinity,
        remaining: Infinity,
        percentUsed: 0,
      };
    }

    // Free users have dynamic lead limit from feature registry
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
  }, [totalLeads, freeLeadLimit, limit]);

  return {
    ...limitInfo,
    isPaid: limit === null,
    loading: isLoading,
  };
}
