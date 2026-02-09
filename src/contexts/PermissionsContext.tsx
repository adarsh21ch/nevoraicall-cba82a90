import React, { createContext, useContext, useMemo } from 'react';
import { useAdminConfig, FeatureFlag } from '@/hooks/useAdminConfig';
import { useSubscription } from '@/hooks/useSubscription';
import { useFreeTrial } from '@/hooks/useFreeTrial';

interface FeaturePermission {
  canAccess: boolean;
  limit: number | null;
}

interface PermissionsContextValue {
  /** Check if a specific feature is accessible */
  checkFeature: (featureKey: string) => boolean;
  /** Get the numeric limit for a feature (null = unlimited) */
  getLimit: (featureKey: string) => number | null;
  /** Get full permission info for a feature */
  getPermission: (featureKey: string) => FeaturePermission;
  /** All computed permissions */
  permissions: Record<string, FeaturePermission>;
  /** Whether user is on a paid plan */
  isPaid: boolean;
  /** Whether trial is active */
  isTrialActive: boolean;
  /** Loading state */
  isLoading: boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { config, loading: configLoading } = useAdminConfig();
  const { isPaid, loading: subLoading } = useSubscription();
  const { isTrialActive, loading: trialLoading } = useFreeTrial();

  const isLoading = configLoading || subLoading || trialLoading;

  // Compute all permissions once from the config
  const permissions = useMemo(() => {
    const map: Record<string, FeaturePermission> = {};

    for (const [key, feature] of Object.entries(config.features)) {
      if (!feature.is_enabled) {
        map[key] = { canAccess: false, limit: null };
        continue;
      }

      if (isTrialActive) {
        map[key] = { canAccess: feature.trial_access, limit: feature.trial_limit };
      } else if (isPaid) {
        map[key] = { canAccess: feature.pro_access, limit: feature.pro_limit };
      } else {
        map[key] = { canAccess: feature.free_access, limit: feature.free_limit };
      }
    }

    return map;
  }, [config.features, isPaid, isTrialActive]);

  const checkFeature = (featureKey: string): boolean => {
    return permissions[featureKey]?.canAccess ?? true; // Default allow if not in registry
  };

  const getLimit = (featureKey: string): number | null => {
    return permissions[featureKey]?.limit ?? null;
  };

  const getPermission = (featureKey: string): FeaturePermission => {
    return permissions[featureKey] ?? { canAccess: true, limit: null };
  };

  const value = useMemo(() => ({
    checkFeature,
    getLimit,
    getPermission,
    permissions,
    isPaid,
    isTrialActive,
    isLoading,
  }), [permissions, isPaid, isTrialActive, isLoading]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

/**
 * Access the global permissions context.
 * Must be used within <PermissionsProvider>.
 * 
 * @example
 * ```tsx
 * const { checkFeature, getLimit } = usePermissions();
 * if (!checkFeature('export_data')) return <UpgradePrompt />;
 * const dailyLimit = getLimit('daily_lead_limit'); // 50 for free, null for pro
 * ```
 */
export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within <PermissionsProvider>');
  }
  return ctx;
}
