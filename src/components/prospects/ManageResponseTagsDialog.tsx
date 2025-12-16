import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Trash2, Star, Tag, X, Loader2, Check, Lock } from 'lucide-react';
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
    ownLeadsPersonalTags,
  } = useTrackingFormatContext();
  const { profile, updateProfile } = useProfile();
  
  // Only for root leaders - tracking tag editing
  const [trackingTags, setTrackingTags] = useState<LeadsTagInput[]>([]);
  // For all users - personal tag editing
  const [personalTags, setPersonalTags] = useState<string[]>([]);
  const [newPersonalTag, setNewPersonalTag] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from tracking format
  useEffect(() => {
    if (open) {
      // Tracking tags - only editable if root leader
      const tags = leadsTrackingTags.map(t => ({
        name: t.name,
        isStageTag: t.isStageTag,
        isFinalTarget: t.isFinalTarget,
      }));
      setTrackingTags(tags.length > 0 ? tags : [{ name: '', isStageTag: false, isFinalTarget: false }]);
      
      // Personal tags - always user's own
      setPersonalTags(ownLeadsPersonalTags || []);
    }
  }, [leadsTrackingTags, ownLeadsPersonalTags, open]);

  // Auto-save function for personal tags
  const autoSavePersonalTags = useCallback(async () => {
    setAutoSaveStatus('saving');
    
    // Get current response_labels and only update nonTracking
    const currentResponseLabels = profile?.response_labels as any;
    
    const responseLabelsData = {
      tracking: currentResponseLabels?.tracking || [],
      nonTracking: personalTags,
    };
    
    await updateProfile({
      response_labels: responseLabelsData as any,
    });
    
    refreshFormat();
    setAutoSaveStatus('saved');
    setTimeout(() => setAutoSaveStatus('idle'), 1500);
  }, [personalTags, profile?.response_labels, updateProfile, refreshFormat]);

  // Auto-save function for root leader (tracking + personal)
  const autoSaveAll = useCallback(async () => {
    if (!isRootLeader) {
      // Members only save personal tags
      await autoSavePersonalTags();
      return;
    }
    
    setAutoSaveStatus('saving');
    
    const validTags = trackingTags.filter(t => t.name.trim());
    
    const responseLabelsData = {
      tracking: validTags.map(t => ({
        name: t.name.trim(),
        isStageTag: t.isStageTag,
        isFinalTarget: t.isFinalTarget,
      })),
      nonTracking: personalTags,
    };
    
    await updateProfile({
      response_labels: responseLabelsData as any,
      stage_count: validTags.length,
    });
    
    refreshFormat();
    setAutoSaveStatus('saved');
    setTimeout(() => setAutoSaveStatus('idle'), 1500);
  }, [trackingTags, personalTags, isRootLeader, updateProfile, refreshFormat, autoSavePersonalTags]);

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
        // Only ONE tag can be the Filter Tag
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

  // === Personal tag handlers (all users) ===
  const handleAddPersonalTag = () => {
    const tag = newPersonalTag.trim().toUpperCase();
    if (!tag) return;
    
    // Check if tag already exists in tracking or personal
    const trackingNames = leadsTrackingTags.map(t => t.name.toUpperCase());
    if (personalTags.map(t => t.toUpperCase()).includes(tag) || trackingNames.includes(tag)) {
      toast.error('This tag already exists');
      return;
    }
    
    setPersonalTags([...personalTags, tag]);
    setNewPersonalTag('');
    triggerAutoSave();
  };

  const handleRemovePersonalTag = (index: number) => {
    setPersonalTags(personalTags.filter((_, i) => i !== index));
    triggerAutoSave();
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
          {/* SECTION A: Tracking Tags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">
                  {isUsingLeaderFormat && !isRootLeader 
                    ? `Tracking Tags (from ${directLeaderName || 'Leader'})`
                    : 'Tracking Tags (Your Config)'
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
                    <span className="text-xs text-muted-foreground italic">No tracking tags from leader</span>
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

          <Separator />

          {/* SECTION B: Personal Tags (all users can edit) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Your Personal Tags (not counted)</p>
            </div>
            
            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Personal tags are for your own organization only and don't appear in team analytics.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {personalTags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs flex items-center gap-1 pr-1">
                  {tag}
                  <button
                    onClick={() => handleRemovePersonalTag(idx)}
                    className="hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              {personalTags.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No personal tags yet</span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newPersonalTag}
                onChange={(e) => setNewPersonalTag(e.target.value.toUpperCase())}
                placeholder="Add personal tag..."
                className="h-8 text-sm flex-1 uppercase"
                onKeyDown={(e) => e.key === 'Enter' && handleAddPersonalTag()}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddPersonalTag}
                disabled={!newPersonalTag.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}