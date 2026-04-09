import { usePreviewMode, STEP_LABELS } from '@/contexts/PreviewModeContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Eye, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function PreviewSessionSummary() {
  const { showExitSummary, setShowExitSummary, completedSteps, notes, getSessionDuration } = usePreviewMode();

  const duration = getSessionDuration();
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  const handleCopy = () => {
    const lines = notes.map(n => `• Step ${n.step} (${STEP_LABELS[n.step]}): ${n.note}`);
    const text = `Nevorai Onboarding Preview Notes\n${'─'.repeat(36)}\nSteps reviewed: ${completedSteps.length} / 12\nTime spent: ${mins}m ${secs}s\n\n${lines.length > 0 ? lines.join('\n') : 'No notes taken.'}`;
    navigator.clipboard.writeText(text);
    toast.success('Notes copied to clipboard');
  };

  return (
    <Sheet open={showExitSummary} onOpenChange={setShowExitSummary}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Eye className="h-5 w-5 text-indigo-500" />
            Preview Session Complete
          </SheetTitle>
          <SheetDescription>
            Steps reviewed: {completedSteps.length} / 12 · Time spent: {mins}m {secs}s
          </SheetDescription>
        </SheetHeader>

        {notes.length > 0 && (
          <div className="mb-5 space-y-2">
            <p className="text-sm font-semibold">📝 Your Notes:</p>
            {notes.map((n, i) => (
              <div key={i} className="bg-muted/50 rounded-xl px-3 py-2 text-sm">
                <span className="font-medium text-indigo-600">Step {n.step}:</span>{' '}
                <span className="text-foreground">{n.note}</span>
              </div>
            ))}
          </div>
        )}

        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground mb-5">No notes were taken during this session.</p>
        )}

        <div className="flex gap-3">
          {notes.length > 0 && (
            <Button variant="outline" onClick={handleCopy} className="flex-1 rounded-xl gap-2">
              <Copy className="h-4 w-4" />
              Copy Notes
            </Button>
          )}
          <Button onClick={() => setShowExitSummary(false)} className="flex-1 rounded-xl gap-2">
            <Trash2 className="h-4 w-4" />
            Clear & Exit
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
