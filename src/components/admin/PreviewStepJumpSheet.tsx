import { usePreviewMode, STEP_LABELS } from '@/contexts/PreviewModeContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export function PreviewStepJumpSheet() {
  const { showStepJump, setShowStepJump, currentStep, completedSteps, goToStep } = usePreviewMode();

  return (
    <Sheet open={showStepJump} onOpenChange={setShowStepJump}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-base">Jump to any step</SheetTitle>
          <SheetDescription>Select a step to preview it directly.</SheetDescription>
        </SheetHeader>

        <div className="space-y-1">
          {STEP_LABELS.map((label, i) => {
            const isCompleted = completedSteps.includes(i);
            const isCurrent = i === currentStep;
            return (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isCurrent
                    ? 'bg-indigo-100 text-indigo-900 font-semibold'
                    : 'hover:bg-muted/60'
                }`}
              >
                <span className="w-5 text-center shrink-0">
                  {isCompleted ? '✅' : isCurrent ? '●' : '○'}
                </span>
                <span className="text-muted-foreground w-14 shrink-0 text-xs">Step {i}</span>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
