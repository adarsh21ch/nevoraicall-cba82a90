import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIAssistantButtonProps {
  onClick: () => void;
  className?: string;
}

export function AIAssistantButton({ onClick, className }: AIAssistantButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={`fixed z-30 h-12 w-12 rounded-full shadow-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 ${className ?? 'bottom-20 right-4'}`}
    >
      <Sparkles className="h-5 w-5" />
    </Button>
  );
}
