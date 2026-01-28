import { useAdminConfig } from './useAdminConfig';
import { useSubscription } from './useSubscription';
import { useMemo } from 'react';

/**
 * Hook to check if the current user has access to a specific feature.
 * Uses admin-configured feature flags from the database.
 * 
 * @param featureKey - The unique key of the feature to check (e.g., 'insights', 'export', 'team_sync')
 * @returns Object containing access status and feature details
 * 
 * @example
 * ```tsx
 * const { canAccess, feature } = useFeatureAccess('team_sync');
 * 
 * if (!canAccess) {
 *   return <UpgradePrompt feature={feature?.feature_name} />;
 * }
 * return <TeamSyncComponent />;
 * ```
 */
export function useFeatureAccess(featureKey: string) {
  const { config, loading: configLoading } = useAdminConfig();
  const { isPaid, loading: subLoading } = useSubscription();

  const result = useMemo(() => {
    const feature = config.features[featureKey];
    
    // If feature doesn't exist in config, default to allowing access
    if (!feature) {
      return {
        canAccess: true,
        feature: null,
        isLoading: configLoading || subLoading,
        reason: 'feature_not_found',
      };
    }

    // Check if feature is globally disabled
    if (!feature.is_enabled) {
      return {
        canAccess: false,
        feature,
        isLoading: false,
        reason: 'feature_disabled',
      };
    }

    // Check access based on user's plan
    const hasAccess = isPaid ? feature.pro_access : feature.free_access;

    return {
      canAccess: hasAccess,
      feature,
      isLoading: configLoading || subLoading,
      reason: hasAccess ? 'allowed' : 'plan_restriction',
    };
  }, [config.features, featureKey, isPaid, configLoading, subLoading]);

  return result;
}

/**
 * Hook to check multiple features at once.
 * Useful for components that depend on multiple feature flags.
 * 
 * @param featureKeys - Array of feature keys to check
 * @returns Object with access info for each feature and a combined allAllowed flag
 */
export function useMultipleFeatureAccess(featureKeys: string[]) {
  const { config, loading: configLoading } = useAdminConfig();
  const { isPaid, loading: subLoading } = useSubscription();

  const result = useMemo(() => {
    const accessMap: Record<string, boolean> = {};
    
    for (const key of featureKeys) {
      const feature = config.features[key];
      if (!feature || !feature.is_enabled) {
        accessMap[key] = !feature; // Allow if feature not found, deny if disabled
      } else {
        accessMap[key] = isPaid ? feature.pro_access : feature.free_access;
      }
    }

    const allAllowed = featureKeys.every(key => accessMap[key]);
    const anyAllowed = featureKeys.some(key => accessMap[key]);

    return {
      accessMap,
      allAllowed,
      anyAllowed,
      isLoading: configLoading || subLoading,
    };
  }, [config.features, featureKeys, isPaid, configLoading, subLoading]);

  return result;
}
