import { useRef, useEffect, useState } from 'react';
import { Search, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface CollapsibleSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CollapsibleSearchBar({
  value,
  onChange,
  placeholder = "Search name, phone...",
  className,
}: CollapsibleSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Keep expanded if there's a value
  useEffect(() => {
    if (value && !isExpanded) {
      setIsExpanded(true);
    }
  }, [value, isExpanded]);

  const handleClose = () => {
    onChange('');
    setIsExpanded(false);
  };

  // On desktop, always show full search bar
  if (!isMobile) {
    return (
      <div className={cn("relative w-full", className)}>
        <div className="relative flex items-center bg-muted/50 rounded-xl border border-border/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-10 pl-9 pr-9 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none rounded-xl"
          />
          {value && (
            <button
              onClick={() => onChange('')}
              className="absolute right-2 p-1 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mobile: Show collapsed icon button OR full search bar
  if (!isExpanded && !value) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "flex items-center justify-center h-9 w-9 rounded-lg bg-muted/60 border border-border/30 hover:bg-muted transition-colors",
          className
        )}
      >
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  // Expanded state: Full search bar with back button
  return (
    <div className={cn("flex items-center gap-2 w-full animate-fade-in", className)}>
      <button
        onClick={handleClose}
        className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted/60 hover:bg-muted transition-colors shrink-0"
      >
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="relative flex-1 flex items-center bg-muted/50 rounded-xl border border-border/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 pl-9 pr-9 bg-transparent text-sm placeholder:text-muted-foreground/60 focus:outline-none rounded-xl"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
