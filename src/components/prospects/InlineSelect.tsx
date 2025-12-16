import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface InlineSelectProps<T extends string> {
  value: T | null | undefined;
  options: readonly T[] | T[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  renderValue?: (value: T) => React.ReactNode;
  finalTargetTag?: string | null;
  funnelTag?: string | null; // The Response tag marked as Funnel Tag
}

export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  className,
  renderValue,
  finalTargetTag = null,
  funnelTag = null,
}: InlineSelectProps<T>) {
  // Handle selection - allow toggling (selecting same value deselects it)
  const handleValueChange = (v: string) => {
    if (v === value) {
      onChange('' as T);
    } else {
      onChange(v as T);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Select
        value={value ?? ''}
        onValueChange={handleValueChange}
      >
        <SelectTrigger 
          className={cn(
            'h-9 sm:h-8 text-xs border-0 bg-transparent hover:bg-muted/50 focus:ring-1 focus:ring-border/30 focus:bg-transparent min-w-[70px]',
            className
          )}
        >
          <SelectValue placeholder={placeholder}>
            {value && renderValue ? renderValue(value) : value || placeholder}
          </SelectValue>
        </SelectTrigger>
        <SelectContent 
          className="bg-popover border border-border z-[100] max-h-[280px] overflow-y-auto"
          position="popper"
          sideOffset={4}
          align="start"
        >
          {options.map((option) => (
            <SelectItem 
              key={option} 
              value={option} 
              className="text-xs min-h-[44px] sm:min-h-[32px] flex items-center"
            >
              <div className="flex items-center gap-2">
                {renderValue ? renderValue(option) : option}
                {funnelTag === option && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
                {finalTargetTag === option && finalTargetTag !== funnelTag && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
