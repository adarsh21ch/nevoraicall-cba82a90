import { ChevronLeft, ChevronRight, StickyNote, X, Eye } from 'lucide-react';
import { usePreviewMode, STEP_LABELS } from '@/contexts/PreviewModeContext';
import { Button } from '@/components/ui/button';

export function PreviewModeBanner() {
  const { active, currentStep, nextStep, prevStep, setShowNoteInput, setShowStepJump, exitPreview } = usePreviewMode();

  if (!active) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#1E1B4B] text-white px-3 py-1.5 flex items-center justify-between gap-2" style={{ height: 48 }}>
      <div className="flex items-center gap-1.5 min-w-0">
        <Eye className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
        <span className="text-[11px] font-semibold tracking-wide hidden sm:inline">PREVIEW</span>
      </div>

      <button
        onClick={() => setShowStepJump(true)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-200 hover:text-white transition-colors min-w-0"
      >
        <span className="truncate">Step {currentStep}/{11}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i < currentStep ? 'bg-indigo-400' : i === currentStep ? 'bg-white' : 'bg-indigo-700'}`}
            />
          ))}
        </div>
      </button>

      <div className="flex items-center gap-0.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-indigo-300 hover:text-white hover:bg-indigo-800"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-indigo-300 hover:text-white hover:bg-indigo-800"
          onClick={nextStep}
          disabled={currentStep >= 11}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-indigo-300 hover:text-white hover:bg-indigo-800"
          onClick={() => setShowNoteInput(true)}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-300 hover:text-white hover:bg-red-900/60"
          onClick={exitPreview}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
