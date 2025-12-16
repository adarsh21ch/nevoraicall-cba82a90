import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Star, Tag, Loader2, Check, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { useProfile } from '@/hooks/useProfile';

interface ManageResponseTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeadsTagInput {
  name: string;
  isStageTag: boolean;
  isFinalTarget: boolean;
}

export function ManageResponseTagsDialog({ open, onOpenChange }: ManageResponseTagsDialogProps) {
  const { 
    refreshFormat, 
    isRootLeader, 
    isUsingLeaderFormat, 
    directLeaderName,
    leadsTrackingTags, 
  } = useTrackingFormatContext();
  const { profile, updateProfile } = useProfile();
  
  // Only for root leaders - tracking tag editing
  const [trackingTags, setTrackingTags] = useState<LeadsTagInput[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from tracking format
  useEffect(() => {
    if (open) {
      const tags = leadsTrackingTags.map(t => ({
        name: t.name,
        isStageTag: t.isStageTag,
        isFinalTarget: t.isFinalTarget,
      }));
      setTrackingTags(tags.length > 0 ? tags : [{ name: '', isStageTag: false, isFinalTarget: false }]);
    }
  }, [leadsTrackingTags, open]);

  // Auto-save function for root leader
  const autoSaveAll = useCallback(async () => {
    if (!isRootLeader) return;
    
    setAutoSaveStatus('saving');
    
    const validTags = trackingTags.filter(t => t.name.trim());
    
    const responseLabelsData = {
      tracking: validTags.map(t => ({
        name: t.name.trim(),
        isStageTag: t.isStageTag,
        isFinalTarget: t.isFinalTarget,
      })),
    };
    
    await updateProfile({
      response_labels: responseLabelsData as any,
      stage_count: validTags.length,
    });
    
    refreshFormat();
    setAutoSaveStatus('saved');
    setTimeout(() => setAutoSaveStatus('idle'), 1500);
  }, [trackingTags, isRootLeader, updateProfile, refreshFormat]);

  // Debounced auto-save
  const triggerAutoSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      autoSaveAll();
    }, 800);
  }, [autoSaveAll]);

  // === Tracking tag handlers (root leader only) ===
  const handleTrackingTagChange = (index: number, field: keyof LeadsTagInput, value: any) => {
    if (!isRootLeader) return;
    
    setTrackingTags(prev => {
      const updated = [...prev];
      if (field === 'isStageTag' && value === true) {
        // Only ONE tag can be the Funnel Tag
        updated.forEach((t, i) => { t.isStageTag = i === index; });
      } else if (field === 'isStageTag' && value === false) {
        updated[index] = { ...updated[index], isStageTag: false };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
    triggerAutoSave();
  };

  const handleAddTrackingTag = () => {
    if (!isRootLeader) return;
    if (trackingTags.length < 4) {
      setTrackingTags([...trackingTags, { name: '', isStageTag: false, isFinalTarget: false }]);
    }
  };

  const handleRemoveTrackingTag = (index: number) => {
    if (!isRootLeader) return;
    if (trackingTags.length > 1) {
      const updated = trackingTags.filter((_, i) => i !== index);
      setTrackingTags(updated);
      triggerAutoSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Manage Response Tags
            </DialogTitle>
            {autoSaveStatus === 'saving' && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Response Tags Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">
                  {isUsingLeaderFormat && !isRootLeader 
                    ? `Response Tags (from ${directLeaderName || 'Leader'})`
                    : 'Response Tags'
                  }
                </p>
              </div>
              {isUsingLeaderFormat && !isRootLeader && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Lock className="h-3 w-3" /> Read-only
                </Badge>
              )}
              {isRootLeader && trackingTags.length < 4 && (
                <Button variant="outline" size="sm" onClick={handleAddTrackingTag}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground">
              Response tags are used in the Leads tab. Mark one as ★ Funnel Tag to move leads to the Funnel tab.
            </p>
            
            {isUsingLeaderFormat && !isRootLeader ? (
              // Read-only view for members
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {leadsTrackingTags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs gap-1">
                      {tag.name}
                      {tag.isStageTag && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    </Badge>
                  ))}
                  {leadsTrackingTags.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No response tags from leader</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  These tags are managed by your leader. Contact them to make changes.
                </p>
              </div>
            ) : (
              // Editable view for root leaders
              <div className="space-y-2">
                {trackingTags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Input
                      value={tag.name}
                      onChange={(e) => handleTrackingTagChange(index, 'name', e.target.value.toUpperCase())}
                      placeholder={`Response ${index + 1}`}
                      className="flex-1 h-8 uppercase"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTrackingTagChange(index, 'isStageTag', !tag.isStageTag)}
                        className={`p-1 rounded transition-colors flex items-center gap-1 text-xs ${tag.isStageTag ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' : 'text-muted-foreground hover:text-yellow-600'}`}
                        title="Mark as Funnel Tag (moves leads to Funnel tab)"
                      >
                        <Star className={`h-4 w-4 ${tag.isStageTag ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        {tag.isStageTag && <span>Funnel</span>}
                      </button>
                      {trackingTags.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveTrackingTag(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
