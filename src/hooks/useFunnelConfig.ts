import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FunnelConfig {
  id?: string;
  funnel_name: string;
  funnel_length: number;
  day_1_start: string;
}

export function useFunnelConfig() {
  const [config, setConfig] = useState<FunnelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchConfig = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('funnel_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching funnel config:', error);
    } else if (data) {
      setConfig({
        id: data.id,
        funnel_name: data.funnel_name,
        funnel_length: data.funnel_length,
        day_1_start: data.day_1_start,
      });
    } else {
      // No config exists, set default
      setConfig(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = async (newConfig: Omit<FunnelConfig, 'id'>) => {
    if (!user) return;

    if (config?.id) {
      // Update existing
      const { error } = await supabase
        .from('funnel_configs')
        .update({
          funnel_name: newConfig.funnel_name,
          funnel_length: newConfig.funnel_length,
          day_1_start: newConfig.day_1_start,
        })
        .eq('id', config.id);

      if (error) {
        console.error('Error updating funnel config:', error);
        return false;
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('funnel_configs')
        .insert({
          user_id: user.id,
          funnel_name: newConfig.funnel_name,
          funnel_length: newConfig.funnel_length,
          day_1_start: newConfig.day_1_start,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting funnel config:', error);
        return false;
      }
      if (data) {
        setConfig({
          id: data.id,
          funnel_name: data.funnel_name,
          funnel_length: data.funnel_length,
          day_1_start: data.day_1_start,
        });
      }
    }

    await fetchConfig();
    return true;
  };

  // Get valid stages based on funnel length
  const getValidStages = (): string[] => {
    const length = config?.funnel_length || 3;
    const baseStages: string[] = [];
    
    for (let i = 1; i <= length; i++) {
      baseStages.push(`Day ${i}`);
    }
    
    return baseStages;
  };

  return { 
    config, 
    loading, 
    saveConfig, 
    refetch: fetchConfig,
    getValidStages,
  };
}
