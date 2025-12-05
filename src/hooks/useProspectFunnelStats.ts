import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FunnelStats {
  enrollment: number;
  day_1: number;
  day_2: number;
  day_3: number;
  minimum_bill: number;
  level_up: number;
  two_cc: number;
}

// Note: funnel_stage was removed from prospects table in simplified model
// This hook now returns total prospect count only
export function useProspectFunnelStats() {
  const [loading, setLoading] = useState(true);
  const [totalProspects, setTotalProspects] = useState(0);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { count, error } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!error && count !== null) {
      setTotalProspects(count);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = useMemo<FunnelStats>(() => ({
    enrollment: 0,
    day_1: 0,
    day_2: 0,
    day_3: 0,
    minimum_bill: 0,
    level_up: 0,
    two_cc: 0,
  }), []);

  return { totals, loading, totalProspects, refetch: fetchData };
}
