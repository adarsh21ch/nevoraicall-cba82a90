import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Download } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Filters {
  search: string;
}

interface ProspectFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onExport: () => void;
}

export function ProspectFilters({ filters, onFiltersChange, onExport }: ProspectFiltersProps) {
  const hasFilters = filters.search;
  const isMobile = useIsMobile();

  const clearFilters = () => {
    onFiltersChange({
      search: '',
    });
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Search bar - full width on mobile */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-8 h-10 sm:h-9 w-full"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 sm:h-9 px-2 text-xs shrink-0">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onExport} className="h-10 sm:h-9 gap-1.5 shrink-0">
          <Download className="h-3.5 w-3.5" />
          {!isMobile && 'Export'}
        </Button>
      </div>
    </div>
  );
}
