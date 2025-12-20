import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrackUpLoadingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onOpenInBrowser: () => void;
}

export function TrackUpLoadingOverlay({
  isOpen,
  onClose,
  onRetry,
  onOpenInBrowser,
}: TrackUpLoadingOverlayProps) {
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSlowLoading(false);
      return;
    }

    // Start 8-second timer when overlay opens
    const timer = setTimeout(() => {
      setIsSlowLoading(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full max-w-sm mx-4 p-6 rounded-2xl bg-card border border-border/50 shadow-xl text-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted/50 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Loader */}
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-emerald-500/10">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-xl font-semibold mb-2">
          {isSlowLoading ? 'Still loading…' : 'Opening TrackUp…'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {isSlowLoading
            ? 'Slow network or first-time load. You can wait, retry, or open in browser.'
            : 'Please wait'}
        </p>

        {/* Action buttons - only show when slow loading */}
        {isSlowLoading && (
          <div className="space-y-3">
            <Button
              onClick={onRetry}
              variant="default"
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
            <Button
              onClick={onOpenInBrowser}
              variant="outline"
              className="w-full gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in browser
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
