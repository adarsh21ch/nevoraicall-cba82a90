import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, GitBranch } from 'lucide-react';

export type TabType = 'calling' | 'funnel';

interface CallingFunnelTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  callingCount: number;
  funnelCount: number;
}

export function CallingFunnelTabs({ activeTab, onTabChange, callingCount, funnelCount }: CallingFunnelTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabType)} className="mb-4">
      <TabsList className="grid w-full max-w-[300px] grid-cols-2 bg-muted/50">
        <TabsTrigger value="calling" className="text-xs sm:text-sm gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          Calling
          <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {callingCount}
          </span>
        </TabsTrigger>
        <TabsTrigger value="funnel" className="text-xs sm:text-sm gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          Funnel
          <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {funnelCount}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
