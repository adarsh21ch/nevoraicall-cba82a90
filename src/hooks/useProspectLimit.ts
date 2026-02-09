import { useMemo } from 'react';
import { Prospect } from '@/types/prospect';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

// Soft limit for upgrade prompt (no hard blocking)
const DEFAULT_SOFT_LIMIT = 50;

export function useProspectLimit(prospects: Prospect[], isPro: boolean) {
  const { limit } = useFeatureAccess('total_lead_limit');

  // Count unique prospects by phone number
  const uniqueCount = useMemo(() => {
    const uniquePhones = new Set(prospects.map(p => p.phone?.trim().toLowerCase()).filter(Boolean));
    return uniquePhones.size;
  }, [prospects]);

  // Soft limit from feature registry, or default
  const softLimit = limit ?? DEFAULT_SOFT_LIMIT;

  // No hard limits - just soft prompts for Free users
  const showUpgradeHint = !isPro && uniqueCount >= softLimit;

  // Always allow adding - no blocking
  const canAdd = () => true;

  return {
    uniqueCount,
    isPro,
    showUpgradeHint,
    canAdd,
    // Legacy compatibility - no longer enforced
    isAtLimit: false,
    isNearLimit: showUpgradeHint,
    limit: Infinity,
    remaining: Infinity,
    getAvailableSlots: () => Infinity,
  };
}
