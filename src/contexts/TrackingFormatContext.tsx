import React, { createContext, useContext, useCallback } from 'react';
import { useTrackingFormat, TrackingTag, StageTag, TeamLevel, TrackingFormat } from '@/hooks/useTrackingFormat';
import { toast } from 'sonner';

interface TrackingFormatContextType {
  trackingFormat: TrackingFormat | null;
  loading: boolean;
  refreshFormat: () => void;
  
  // Response tags
  leadsTrackingTags: TrackingTag[];
  leadsTrackingTagNames: string[];
  leadsFunnelTag: string | null;
  isLeadsFunnelTag: (tagName: string) => boolean;
  isLeadsTrackingTag: (tagName: string) => boolean;
  
  // Stage tags
  stageTags: StageTag[];
  stageTagNames: string[];
  stageFinalTargetTag: string | null;
  isStageFinalTarget: (tagName: string) => boolean;
  isStageTag: (tagName: string) => boolean;
  
  // Team levels
  levels: TeamLevel[];
  
  // Metadata
  isRootLeader: boolean;
  isUsingLeaderFormat: boolean;
  directLeaderName: string | null;
  directLeaderId: string | null;
  rootLeaderName: string | null;
  
  // Legacy aliases for backward compatibility
  leadsStageTag: string | null;
  isLeadsStageTag: (tagName: string) => boolean;
  leadsFilterTag: string | null;
  isLeadsFilterTag: (tagName: string) => boolean;
  trackingTagNames: string[];
  finalTargetTag: string | null;
  isFinalTarget: (tagName: string) => boolean;
  isTrackingTag: (tagName: string) => boolean;
  
  // Helpers
  handleTargetComplete: (tagName: string, prospectName?: string) => void;
  getLeadsDropdownOptions: () => string[];
  getStageDropdownOptions: () => string[];
}

const TrackingFormatContext = createContext<TrackingFormatContextType | null>(null);

export function TrackingFormatProvider({ children }: { children: React.ReactNode }) {
  const trackingFormatHook = useTrackingFormat();

  // Handle target completion when final tag is selected
  const handleTargetComplete = useCallback((tagName: string, prospectName?: string) => {
    if (trackingFormatHook.isStageFinalTarget(tagName)) {
      toast.success(`🏆 Final Stage Reached! ${prospectName ? `(${prospectName})` : ''}`, {
        duration: 2000,
      });
    }
  }, [trackingFormatHook.isStageFinalTarget]);

  // Get Leads dropdown options (only tracking tags)
  const getLeadsDropdownOptions = useCallback(() => {
    return trackingFormatHook.leadsTrackingTagNames || [];
  }, [trackingFormatHook.leadsTrackingTagNames]);

  // Get Stage dropdown options (only stage tags)
  const getStageDropdownOptions = useCallback(() => {
    return trackingFormatHook.stageTagNames || [];
  }, [trackingFormatHook.stageTagNames]);

  const value: TrackingFormatContextType = {
    ...trackingFormatHook,
    handleTargetComplete,
    getLeadsDropdownOptions,
    getStageDropdownOptions,
  };

  return (
    <TrackingFormatContext.Provider value={value}>
      {children}
    </TrackingFormatContext.Provider>
  );
}

export function useTrackingFormatContext() {
  const context = useContext(TrackingFormatContext);
  if (!context) {
    throw new Error('useTrackingFormatContext must be used within a TrackingFormatProvider');
  }
  return context;
}
