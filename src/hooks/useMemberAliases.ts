import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MemberAlias {
  member_id: string;
  alias_name: string;
}

const ALIAS_CACHE_KEY = 'member_aliases_cache';

export function useMemberAliases() {
  const { user } = useAuth();
  const [aliases, setAliases] = useState<Record<string, string>>(() => {
    try {
      const cached = sessionStorage.getItem(ALIAS_CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(false);

  // Fetch all aliases for this leader
  const fetchAliases = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leader_member_aliases')
        .select('member_id, alias_name')
        .eq('leader_id', user.id);

      if (error) {
        console.error('Error fetching aliases:', error);
        return;
      }

      if (data) {
        const aliasMap: Record<string, string> = {};
        data.forEach(row => {
          aliasMap[row.member_id] = row.alias_name;
        });
        setAliases(aliasMap);
        sessionStorage.setItem(ALIAS_CACHE_KEY, JSON.stringify(aliasMap));
      }
    } catch (err) {
      console.error('Error in fetchAliases:', err);
    }
  }, [user]);

  // Upsert an alias (create or update)
  const setAlias = useCallback(async (memberId: string, aliasName: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const trimmedName = aliasName.trim();
      
      if (!trimmedName) {
        // Delete alias if empty
        const { error } = await supabase
          .from('leader_member_aliases')
          .delete()
          .eq('leader_id', user.id)
          .eq('member_id', memberId);

        if (error) throw error;

        setAliases(prev => {
          const updated = { ...prev };
          delete updated[memberId];
          sessionStorage.setItem(ALIAS_CACHE_KEY, JSON.stringify(updated));
          return updated;
        });
      } else {
        // Upsert alias
        const { error } = await supabase
          .from('leader_member_aliases')
          .upsert({
            leader_id: user.id,
            member_id: memberId,
            alias_name: trimmedName
          }, {
            onConflict: 'leader_id,member_id'
          });

        if (error) throw error;

        setAliases(prev => {
          const updated = { ...prev, [memberId]: trimmedName };
          sessionStorage.setItem(ALIAS_CACHE_KEY, JSON.stringify(updated));
          return updated;
        });
      }

      return true;
    } catch (err) {
      console.error('Error setting alias:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get alias for a member (returns original name if no alias)
  const getDisplayName = useCallback((memberId: string, originalName: string): string => {
    return aliases[memberId] || originalName;
  }, [aliases]);

  // Fetch aliases on mount
  useEffect(() => {
    if (user) {
      fetchAliases();
    }
  }, [user, fetchAliases]);

  return {
    aliases,
    getDisplayName,
    setAlias,
    loading,
    refetch: fetchAliases
  };
}
