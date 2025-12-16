import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export interface TrackingTag {
  name: string;
  isStageTag: boolean;  // true = Funnel tag (appears in Funnel tab)
  isFinalTarget: boolean;
}

export interface StageTag {
  name: string;
  isFinalTarget: boolean;
}

export interface TeamLevel {
  id: string;
  position: number;
  code: string;
  label: string;
  isDefault: boolean;
}

export interface TrackingFormat {
  // Response tags (leads tracking)
  leadsTrackingTags: TrackingTag[];
  
  // Stage tags (funnel progression)
  stageTags: StageTag[];
  
  // Team levels
  levels: TeamLevel[];
  
  // Metadata
  directLeaderName: string | null;
  directLeaderId: string | null;
  isUsingLeaderFormat: boolean;
  isRootLeader: boolean;
  
  // Legacy aliases
  rootLeaderName: string | null;
  rootLeaderId: string | null;
}

// Parse response_labels JSON structure - only tracking tags
function parseResponseLabels(labels: any): TrackingTag[] {
  if (!labels) return [];
  
  // Handle new format: { tracking: [...] }
  if (typeof labels === 'object' && labels.tracking) {
    return (labels.tracking || []).map((t: any) => ({
      name: t.name || t,
      isStageTag: t.isStageTag ?? t.isFilter ?? false,
      isFinalTarget: t.isFinalTarget ?? false,
    }));
  }
  
  // Handle legacy format: string[]
  if (Array.isArray(labels)) {
    return labels.map((name) => ({
      name: String(name),
      isStageTag: false,
      isFinalTarget: false,
    }));
  }
  
  return [];
}

// Parse stage_labels JSON structure - only stage tags
function parseStageLabels(labels: any): StageTag[] {
  if (!labels) return [];
  
  // Handle new format: { stages: [...] }
  if (typeof labels === 'object' && labels.stages) {
    return (labels.stages || []).map((s: any) => ({
      name: s.name || s,
      isFinalTarget: s.isFinalTarget ?? false,
    }));
  }
  
  // Handle legacy format: string[]
  if (Array.isArray(labels)) {
    return labels.map((name, idx, arr) => ({
      name: String(name),
      isFinalTarget: idx === arr.length - 1,
    }));
  }
  
  return [];
}

export function useTrackingFormat() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [trackingFormat, setTrackingFormat] = useState<TrackingFormat | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch DIRECT leader's tracking format
  const fetchDirectLeaderFormat = useCallback(async (leaderNeveraiId: string): Promise<{
    directLeaderId: string;
    directLeaderName: string;
    leadsTracking: TrackingTag[];
    stageTags: StageTag[];
    levels: TeamLevel[];
  } | null> => {
    const { data: leaderProfile, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, neverai_id, response_labels, stage_labels')
      .ilike('neverai_id', leaderNeveraiId)
      .maybeSingle();

    if (error || !leaderProfile) {
      console.error('Error fetching direct leader profile:', error);
      return null;
    }

    // Get leader's levels
    const { data: levels } = await supabase
      .from('leader_levels')
      .select('id, label, code, is_default, position')
      .eq('leader_id', leaderProfile.user_id)
      .order('position', { ascending: true });

    const leadsTracking = parseResponseLabels(leaderProfile.response_labels);
    const stageTags = parseStageLabels(leaderProfile.stage_labels);

    return {
      directLeaderId: leaderProfile.neverai_id || leaderNeveraiId,
      directLeaderName: leaderProfile.display_name || 'Leader',
      leadsTracking,
      stageTags,
      levels: (levels || []).map(l => ({
        id: l.id,
        position: l.position,
        code: l.code || `L${l.position}`,
        label: l.label,
        isDefault: l.is_default
      })),
    };
  }, []);

  // Load tracking format for current user
  const loadTrackingFormat = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // If user creates their own format (is root leader / no leader)
      if (!profile.use_leader_stages || !profile.leaders_id_of_my_leader) {
        const { data: levels } = await supabase
          .from('leader_levels')
          .select('id, label, code, is_default, position')
          .eq('leader_id', user.id)
          .order('position', { ascending: true });

        const leadsTracking = parseResponseLabels(profile.response_labels);
        const stageTags = parseStageLabels(profile.stage_labels);

        setTrackingFormat({
          leadsTrackingTags: leadsTracking,
          stageTags,
          levels: (levels || []).map(l => ({
            id: l.id,
            position: l.position,
            code: l.code || `L${l.position}`,
            label: l.label,
            isDefault: l.is_default
          })),
          directLeaderName: null,
          directLeaderId: null,
          isUsingLeaderFormat: false,
          isRootLeader: true,
          rootLeaderName: profile.display_name || 'You',
          rootLeaderId: profile.neverai_id,
        });
      } else {
        // User uses leader's format - fetch DIRECT leader only
        const leaderData = await fetchDirectLeaderFormat(profile.leaders_id_of_my_leader);
        
        if (leaderData) {
          setTrackingFormat({
            leadsTrackingTags: leaderData.leadsTracking,
            stageTags: leaderData.stageTags,
            levels: leaderData.levels,
            directLeaderName: leaderData.directLeaderName,
            directLeaderId: leaderData.directLeaderId,
            isUsingLeaderFormat: true,
            isRootLeader: false,
            rootLeaderName: leaderData.directLeaderName,
            rootLeaderId: leaderData.directLeaderId,
          });
        } else {
          // Fallback to user's own tags if leader not found
          const leadsTracking = parseResponseLabels(profile.response_labels);
          const stageTags = parseStageLabels(profile.stage_labels);
          
          setTrackingFormat({
            leadsTrackingTags: leadsTracking,
            stageTags,
            levels: [],
            directLeaderName: null,
            directLeaderId: null,
            isUsingLeaderFormat: true,
            isRootLeader: false,
            rootLeaderName: null,
            rootLeaderId: null,
          });
        }
      }
    } catch (error) {
      console.error('Error loading tracking format:', error);
    } finally {
      setLoading(false);
    }
  }, [user, profile, fetchDirectLeaderFormat]);

  useEffect(() => {
    if (!profileLoading) {
      loadTrackingFormat();
    }
  }, [profileLoading, loadTrackingFormat]);

  // Reload format
  const refreshFormat = useCallback(() => {
    loadTrackingFormat();
  }, [loadTrackingFormat]);

  // === LEADS helpers ===
  const leadsTrackingTagNames = useMemo(() => 
    trackingFormat?.leadsTrackingTags.map(t => t.name) || [],
    [trackingFormat]
  );

  const leadsFunnelTag = useMemo(() => 
    trackingFormat?.leadsTrackingTags.find(t => t.isStageTag)?.name || null,
    [trackingFormat]
  );

  const isLeadsFunnelTag = useCallback((tagName: string) => {
    return trackingFormat?.leadsTrackingTags.find(t => t.name === tagName)?.isStageTag || false;
  }, [trackingFormat]);

  const isLeadsTrackingTag = useCallback((tagName: string) => {
    return trackingFormat?.leadsTrackingTags.some(t => t.name === tagName) || false;
  }, [trackingFormat]);

  // === STAGE helpers ===
  const stageTagNames = useMemo(() => 
    trackingFormat?.stageTags.map(t => t.name) || [],
    [trackingFormat]
  );

  const stageFinalTargetTag = useMemo(() => 
    trackingFormat?.stageTags.find(t => t.isFinalTarget)?.name || null,
    [trackingFormat]
  );

  const isStageFinalTarget = useCallback((tagName: string) => {
    return trackingFormat?.stageTags.find(t => t.name === tagName)?.isFinalTarget || false;
  }, [trackingFormat]);

  const isStageTag = useCallback((tagName: string) => {
    return trackingFormat?.stageTags.some(t => t.name === tagName) || false;
  }, [trackingFormat]);

  return {
    trackingFormat,
    loading: loading || profileLoading,
    refreshFormat,
    
    // Response tags
    leadsTrackingTags: trackingFormat?.leadsTrackingTags || [],
    leadsTrackingTagNames,
    leadsFunnelTag,
    isLeadsFunnelTag,
    isLeadsTrackingTag,
    
    // Stage tags
    stageTags: trackingFormat?.stageTags || [],
    stageTagNames,
    stageFinalTargetTag,
    isStageFinalTarget,
    isStageTag,
    
    // Team levels
    levels: trackingFormat?.levels || [],
    
    // Metadata
    isRootLeader: trackingFormat?.isRootLeader || false,
    isUsingLeaderFormat: trackingFormat?.isUsingLeaderFormat || false,
    directLeaderName: trackingFormat?.directLeaderName || null,
    directLeaderId: trackingFormat?.directLeaderId || null,
    rootLeaderName: trackingFormat?.rootLeaderName || null,
    
    // Legacy aliases for backward compatibility
    leadsStageTag: leadsFunnelTag,
    isLeadsStageTag: isLeadsFunnelTag,
    leadsFilterTag: leadsFunnelTag,
    isLeadsFilterTag: isLeadsFunnelTag,
    trackingTagNames: leadsTrackingTagNames,
    finalTargetTag: stageFinalTargetTag,
    isFinalTarget: isStageFinalTarget,
    isTrackingTag: isLeadsTrackingTag,
  };
}
