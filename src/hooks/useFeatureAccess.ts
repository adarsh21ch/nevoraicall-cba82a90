import { useAdminConfig, FeatureFlag } from './useAdminConfig';
import { useSubscription } from './useSubscription';
import { useFreeTrial } from './useFreeTrial';
import { useMemo } from 'react';

export type AccessReason = 
  | 'allowed'
  | 'feature_not_found'
  | 'feature_disabled'
  | 'plan_restriction'
  | 'trial_active'
  | 'trial_expired';

export interface FeatureAccessResult {
  canAccess: boolean;
  limit: number | null;
  feature: FeatureFlag | null;
  isLoading: boolean;
  reason: AccessReason;
}

/**
 * Central hook to check if the current user has access to a specific feature.
 * Reads from admin-configured feature flags and integrates subscription + trial state.
 * 
 * @param featureKey - The unique key of the feature to check
 * @returns FeatureAccessResult with access status, numeric limit, and reason
 * 
 * @example
 * ```tsx
 * const { canAccess, limit } = useFeatureAccess('daily_lead_limit');
 * if (!canAccess) return <UpgradePrompt />;
 * // limit is 50 for free, null (unlimited) for pro
 * ```
 */
export function useFeatureAccess(featureKey: string): FeatureAccessResult {
  const { config, loading: configLoading } = useAdminConfig();
  const { isPaid, loading: subLoading } = useSubscription();
  const { isTrialActive, loading: trialLoading } = useFreeTrial();

  const isLoading = configLoading || subLoading || trialLoading;

  return useMemo(() => {
    const feature = config.features[featureKey] ?? null;

    // If feature doesn't exist in config, default to allowing access
    if (!feature) {
      return { canAccess: true, limit: null, feature: null, isLoading, reason: 'feature_not_found' as AccessReason };
    }

    // Check if feature is globally disabled
    if (!feature.is_enabled) {
      return { canAccess: false, limit: null, feature, isLoading, reason: 'feature_disabled' as AccessReason };
    }

    // Determine access based on user state: Trial > Paid > Free
    if (isTrialActive) {
      const hasAccess = feature.trial_access;
      const limit = feature.trial_limit; // null = unlimited (follows pro)
      return {
        canAccess: hasAccess,
        limit: hasAccess ? limit : null,
        feature,
        isLoading,
        reason: hasAccess ? 'trial_active' as AccessReason : 'plan_restriction' as AccessReason,
      };
    }

    if (isPaid) {
      return {
        canAccess: feature.pro_access,
        limit: feature.pro_limit, // null = unlimited
        feature,
        isLoading,
        reason: feature.pro_access ? 'allowed' as AccessReason : 'plan_restriction' as AccessReason,
      };
    }

    // Free user
    return {
      canAccess: feature.free_access,
      limit: feature.free_limit,
      feature,
      isLoading,
      reason: feature.free_access ? 'allowed' as AccessReason : 'plan_restriction' as AccessReason,
    };
  }, [config.features, featureKey, isPaid, isTrialActive, isLoading]);
}

/**
 * Hook to check multiple features at once.
 * Useful for components that depend on multiple feature flags.
 */
export function useMultipleFeatureAccess(featureKeys: string[]) {
  const { config, loading: configLoading } = useAdminConfig();
  const { isPaid, loading: subLoading } = useSubscription();
  const { isTrialActive, loading: trialLoading } = useFreeTrial();

  const isLoading = configLoading || subLoading || trialLoading;

  return useMemo(() => {
    const accessMap: Record<string, { canAccess: boolean; limit: number | null }> = {};

    for (const key of featureKeys) {
      const feature = config.features[key];
      if (!feature || !feature.is_enabled) {
        accessMap[key] = { canAccess: !feature, limit: null }; // Allow if not found, deny if disabled
        continue;
      }

      if (isTrialActive) {
        accessMap[key] = { canAccess: feature.trial_access, limit: feature.trial_limit };
      } else if (isPaid) {
        accessMap[key] = { canAccess: feature.pro_access, limit: feature.pro_limit };
      } else {
        accessMap[key] = { canAccess: feature.free_access, limit: feature.free_limit };
      }
    }

    const allAllowed = featureKeys.every(key => accessMap[key]?.canAccess);
    const anyAllowed = featureKeys.some(key => accessMap[key]?.canAccess);

    return { accessMap, allAllowed, anyAllowed, isLoading };
  }, [config.features, featureKeys, isPaid, isTrialActive, isLoading]);
}
