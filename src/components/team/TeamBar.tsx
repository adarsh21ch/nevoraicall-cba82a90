import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useTeamAccess, TabPermission, AVAILABLE_TABS } from '@/hooks/useTeamAccess';
import { TeamMemberMultiSelect } from './TeamMemberMultiSelect';
import { cn } from '@/lib/utils';

interface SharedOwner {
  user_id: string;
  display_name: string | null;
  nevorid: string | null;
}

interface TeamBarProps {
  sharedOwners: SharedOwner[];
  selectedOwnerIds: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onSelectAll: () => void;
  prospectsCount?: number;
  currentTab: TabPermission;
}

export function TeamBar({
  sharedOwners,
  selectedOwnerIds,
  onToggle,
  onClear,
  onSelectAll,
  prospectsCount,
  currentTab
}: TeamBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { sharedWithMe } = useTeamAccess();

  // Filter owners to only show those who have granted access to currentTab
  const availableOwners = sharedOwners.filter(owner => {
    const access = sharedWithMe.find(a => a.owner_user_id === owner.user_id);
    if (!access) return false;
    // null means all tabs allowed
    if (!access.allowed_tabs) return true;
    return access.allowed_tabs.includes(currentTab);
  });

  const isViewingTeam = selectedOwnerIds.length > 0;

  // If no team members have shared this tab, don't show the bar
  if (availableOwners.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Team Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "gap-2 h-9",
          isViewingTeam && "bg-primary/10 border-primary/30 text-primary"
        )}
      >
        <Users className="h-4 w-4" />
        <span className="text-sm">Team</span>
        {availableOwners.length > 0 && (
          <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
            {availableOwners.length}
          </Badge>
        )}
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Expandable Team Selector Panel */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-lg p-3 space-y-3 animate-in fade-in-0 slide-in-from-top-2 duration-200 min-w-[280px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">View Team Data</span>
            </div>
            {isViewingTeam && (
              <Badge variant="secondary" className="text-xs">
                {prospectsCount ?? 0} prospects
              </Badge>
            )}
          </div>
          
          <TeamMemberMultiSelect
            teamMembers={availableOwners}
            selectedIds={selectedOwnerIds}
            onToggle={onToggle}
            onClear={onClear}
            onSelectAll={onSelectAll}
          />
          
          {isViewingTeam && (
            <p className="text-xs text-muted-foreground">
              Viewing team data (read-only)
            </p>
          )}
        </div>
      )}

      {/* Backdrop to close when clicking outside */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
