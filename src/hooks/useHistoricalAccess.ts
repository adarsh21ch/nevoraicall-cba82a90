import { useState, useMemo, useCallback } from 'react';
import { startOfDay, subDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdminConfig } from '@/hooks/useAdminConfig';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useFreeTrial } from '@/hooks/useFreeTrial';

type Scope = 'leads' | 'funnel';

async function fetchHistoricalScope(): Promise<string[]> {
  const { data, error } = await supabase
    .from('admin_config_text')
    .select('config_value, is_enabled')
    .eq('config_key', 'historical_restriction_scope')
    .maybeSingle();

  if (error || !data || !data.is_enabled) {
    return ['leads', 'funnel'];
  }

  return data.config_value.split(',').map((s: string) => s.trim().toLowerCase());
}

export function useHistoricalAccess() {
  const { config, loading: configLoading } = useAdminConfig();
  const { isPaid, isLoading: permLoading } = usePermissions();
  const { isTrialActive, loading: trialLoading } = useFreeTrial();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: scopeList = ['leads', 'funnel'] } = useQuery({
    queryKey: ['historical-restriction-scope'],
    queryFn: fetchHistoricalScope,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // restrict_historical_data is a boolean toggle stored as 1/0
  // Present in config.limits only when is_enabled = true
  const restrictionEnabled = 'restrict_historical_data' in config.limits;
  const allowedPastDays = config.limits.allowed_past_days ?? 0;

  const loading = configLoading || permLoading || trialLoading;

  const isDateRestricted = useCallback((date: Date, scope: Scope): boolean => {
    if (isPaid || isTrialActive) return false;
    // Never restrict if toggle is off
    if (!restrictionEnabled) return false;
    // Never restrict if scope not included
    if (!scopeList.includes(scope)) return false;

    const today = startOfDay(new Date());
    const cutoffDate = subDays(today, allowedPastDays);
    const targetDate = startOfDay(date);
    return targetDate < cutoffDate;
  }, [isPaid, isTrialActive, restrictionEnabled, allowedPastDays, scopeList]);

  // Check if an entire month is restricted (all days in that month are before cutoff)
  const isMonthFullyRestricted = useCallback((monthYear: string, scope: Scope): boolean => {
    if (isPaid || isTrialActive || !restrictionEnabled) return false;
    if (!scopeList.includes(scope)) return false;

    // monthYear format: 'yyyy-MM'
    const [year, month] = monthYear.split('-').map(Number);
    // Last day of the month
    const lastDayOfMonth = new Date(year, month, 0); // day 0 of next month = last day of this month
    return isDateRestricted(lastDayOfMonth, scope);
  }, [isPaid, isTrialActive, restrictionEnabled, scopeList, isDateRestricted]);

  const triggerRestriction = useCallback(() => {
    setShowUpgradeModal(true);
  }, []);

  return {
    isDateRestricted,
    isMonthFullyRestricted,
    restrictionEnabled,
    allowedPastDays,
    showUpgradeModal,
    setShowUpgradeModal,
    triggerRestriction,
    loading,
  };
}
