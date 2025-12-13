import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamAccess, TabPermission } from '@/hooks/useTeamAccess';
import { Prospect } from '@/types/prospect';
import { parseISO, isSameDay } from 'date-fns';

interface SharedOwner {
  user_id: string;
  display_name: string | null;
  nevorid: string | null;
}

interface TeamActivity {
  id: string;
  type: 'lead' | 'todo';
  name: string;
  phone: string | null;
  stage: string | null;
  action: string | null;
  time: Date;
  owner_name: string;
  owner_id: string;
}

export function useTeamActivities(activityDate: Date, currentTab: TabPermission = 'activity') {
  const { user } = useAuth();
  const { sharedWithMe } = useTeamAccess();
  
  const [sharedOwners, setSharedOwners] = useState<SharedOwner[]>([]);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([]);
  const [teamActivities, setTeamActivities] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [isViewingTeam, setIsViewingTeam] = useState(false);

  // Filter owners based on tab permissions
  const availableOwners = useMemo(() => {
    return sharedOwners.filter(owner => {
      const access = sharedWithMe.find(a => a.owner_user_id === owner.user_id);
      if (!access) return false;
      if (!access.allowed_tabs) return true;
      return access.allowed_tabs.includes(currentTab);
    });
  }, [sharedOwners, sharedWithMe, currentTab]);

  // Fetch shared owners
  const fetchSharedOwners = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: accessRecords, error } = await supabase
        .from('team_access')
        .select('owner_user_id')
        .eq('shared_with_user_id', user.id)
        .eq('status', 'active');
      
      if (error) {
        console.error('Error fetching team access:', error);
        return;
      }
      
      if (accessRecords && accessRecords.length > 0) {
        const ownerIds = accessRecords.map(r => r.owner_user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, neverai_id')
          .in('user_id', ownerIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }
        
        if (profiles) {
          const owners = profiles.map(p => ({
            user_id: p.user_id,
            display_name: p.display_name || 'Unknown',
            nevorid: p.neverai_id
          }));
          setSharedOwners(owners);
        }
      }
    } catch (err) {
      console.error('Error in fetchSharedOwners:', err);
    }
  }, [user]);

  // Fetch team activities for selected owners
  const fetchTeamActivities = useCallback(async () => {
    if (selectedOwnerIds.length === 0 || !isViewingTeam) {
      setTeamActivities([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch prospects for selected owners
      const { data: prospects, error } = await supabase
        .from('prospects')
        .select('*')
        .in('user_id', selectedOwnerIds)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching team prospects:', error);
        setTeamActivities([]);
        return;
      }

      if (prospects) {
        // Filter by date and map to activities
        const activities: TeamActivity[] = prospects
          .filter(p => isSameDay(parseISO(p.updated_at), activityDate))
          .map(p => {
            const owner = sharedOwners.find(o => o.user_id === p.user_id);
            return {
              id: p.id,
              type: 'lead' as const,
              name: p.name,
              phone: p.phone,
              stage: p.funnel_stage,
              action: p.action_taken,
              time: new Date(p.updated_at),
              owner_name: owner?.display_name || 'Unknown',
              owner_id: p.user_id
            };
          })
          .sort((a, b) => b.time.getTime() - a.time.getTime());

        setTeamActivities(activities);
      }
    } catch (err) {
      console.error('Error fetching team activities:', err);
      setTeamActivities([]);
    } finally {
      setLoading(false);
    }
  }, [selectedOwnerIds, isViewingTeam, activityDate, sharedOwners]);

  // Initial fetch of shared owners
  useEffect(() => {
    fetchSharedOwners();
  }, [fetchSharedOwners]);

  // Fetch activities when selection or date changes
  useEffect(() => {
    fetchTeamActivities();
  }, [fetchTeamActivities]);

  // Toggle owner selection
  const toggleOwnerSelection = useCallback((ownerId: string) => {
    setSelectedOwnerIds(prev => {
      if (prev.includes(ownerId)) {
        return prev.filter(id => id !== ownerId);
      }
      return [...prev, ownerId];
    });
  }, []);

  // Select all owners
  const selectAllOwners = useCallback(() => {
    setSelectedOwnerIds(availableOwners.map(o => o.user_id));
    setIsViewingTeam(true);
  }, [availableOwners]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedOwnerIds([]);
    setIsViewingTeam(false);
    setTeamActivities([]);
  }, []);

  // Switch to team view
  const switchToTeam = useCallback(() => {
    if (availableOwners.length > 0) {
      selectAllOwners();
    }
  }, [availableOwners, selectAllOwners]);

  // Switch to my data
  const switchToMyData = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return {
    sharedOwners: availableOwners,
    selectedOwnerIds,
    teamActivities,
    loading,
    isViewingTeam,
    hasTeam: availableOwners.length > 0,
    toggleOwnerSelection,
    selectAllOwners,
    clearSelection,
    switchToTeam,
    switchToMyData,
    refetch: fetchTeamActivities
  };
}
