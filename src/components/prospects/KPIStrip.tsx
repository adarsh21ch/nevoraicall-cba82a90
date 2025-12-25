import { useMemo } from 'react';
import { Prospect } from '@/types/prospect';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { Users, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIStripProps {
  prospects: Prospect[];
  isCalling: boolean;
}

export function KPIStrip({ prospects, isCalling }: KPIStripProps) {
  const {
    leadsTrackingTagNames,
    stageTagNames,
    leadsStageTag,
    handleTargetComplete,
  } = useTrackingFormatContext();

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalLeads = prospects.length;
    
    // Count by tracking tags (Response tags for Leads, Stage tags for Funnel)
    const trackingTags = isCalling ? leadsTrackingTagNames : stageTagNames;
    
    const tagCounts: Record<string, number> = {};
    trackingTags.forEach(tag => {
      if (isCalling) {
        tagCounts[tag] = prospects.filter(p => p.action_taken === tag).length;
      } else {
        tagCounts[tag] = prospects.filter(p => p.funnel_stage === tag).length;
      }
    });

    // Get the final target tag for highlighting
    const finalTag = isCalling ? leadsStageTag : handleTargetComplete;

    return {
      total: totalLeads,
      tagCounts,
      trackingTags,
      finalTag,
    };
  }, [prospects, isCalling, leadsTrackingTagNames, stageTagNames, leadsStageTag, handleTargetComplete]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {/* Total Leads */}
      <div className="flex items-center gap-1.5 shrink-0 bg-muted/60 rounded-full px-2.5 py-1">
        <Users className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium">{kpis.total}</span>
      </div>

      {/* Tracking Tag Counts - no duplicates */}
      {kpis.trackingTags.map(tag => {
        const count = kpis.tagCounts[tag] || 0;
        if (count === 0) return null;
        
        const isFinalTag = tag === kpis.finalTag;
        
        return (
          <div 
            key={tag}
            className={cn(
              "flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 transition-colors",
              isFinalTag 
                ? "bg-amber-500/15 ring-1 ring-amber-500/30" 
                : "bg-muted/40"
            )}
          >
            {isFinalTag && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
            <span className={cn(
              "text-xs font-medium truncate max-w-[60px]",
              isFinalTag ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"
            )}>
              {tag}
            </span>
            <span className={cn(
              "text-xs font-semibold",
              isFinalTag ? "text-amber-700 dark:text-amber-300" : ""
            )}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
