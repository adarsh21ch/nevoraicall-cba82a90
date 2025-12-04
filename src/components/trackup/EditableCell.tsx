import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function EditableCell({ value, onChange, className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const numValue = parseInt(inputValue) || 0;
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setInputValue(value.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full h-9 px-2 text-center text-sm font-medium",
          "bg-primary/5 border-2 border-primary rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          "transition-all duration-200",
          className
        )}
        min={0}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "w-full h-9 flex items-center justify-center text-sm cursor-pointer",
        "rounded-lg transition-all duration-200",
        "hover:bg-primary/5 hover:shadow-inner",
        "active:scale-95",
        value === 0 ? "text-muted-foreground/50" : "text-foreground font-semibold",
        className
      )}
    >
      {value === 0 ? '—' : value}
    </div>
  );
}
