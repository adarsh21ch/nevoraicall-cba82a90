import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Todo } from '@/types/prospect';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamAccess } from '@/hooks/useTeamAccess';

export function useTeamTodos() {
  const { user } = useAuth();
  const { sharedWithMe } = useTeamAccess();
  const [teamTodos, setTeamTodos] = useState<(Todo & { owner_name?: string })[]>([]);
  const [loading, setLoading] = useState(false);

  // Get team member IDs who have shared 'todo' tab access
  const teamMemberIds = sharedWithMe
    .filter(access => {
      if (access.status !== 'active') return false;
      // null means all tabs allowed
      if (!access.allowed_tabs) return true;
      return access.allowed_tabs.includes('todo');
    })
    .map(access => access.owner_user_id);

  const fetchTeamTodos = useCallback(async () => {
    if (!user || teamMemberIds.length === 0) {
      setTeamTodos([]);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch todos from all team members
      const { data: todosData, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .in('user_id', teamMemberIds)
        .order('completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (todosError) {
        console.error('Error fetching team todos:', todosError);
        setTeamTodos([]);
        return;
      }

      // Fetch profiles to get owner names
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', teamMemberIds);

      const profileMap = new Map(
        profilesData?.map(p => [p.user_id, p.display_name || 'Unknown']) || []
      );

      // Add owner name to each todo
      const todosWithOwner = (todosData || []).map(todo => ({
        ...todo,
        owner_name: profileMap.get(todo.user_id) || 'Unknown'
      }));

      setTeamTodos(todosWithOwner as (Todo & { owner_name?: string })[]);
    } catch (err) {
      console.error('Error in fetchTeamTodos:', err);
      setTeamTodos([]);
    } finally {
      setLoading(false);
    }
  }, [user, teamMemberIds.join(',')]);

  useEffect(() => {
    fetchTeamTodos();
  }, [fetchTeamTodos]);

  // Set up real-time subscriptions for team todos
  useEffect(() => {
    if (teamMemberIds.length === 0) return;

    const channels = teamMemberIds.map(ownerId => {
      return supabase
        .channel(`team-todos-${ownerId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${ownerId}`
          },
          () => {
            // Refetch on any change
            fetchTeamTodos();
          }
        )
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [teamMemberIds.join(','), fetchTeamTodos]);

  return {
    teamTodos,
    loading,
    hasTeamAccess: teamMemberIds.length > 0,
    refetch: fetchTeamTodos
  };
}
