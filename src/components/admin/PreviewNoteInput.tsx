import { useState } from 'react';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote } from 'lucide-react';

export function PreviewNoteInput() {
  const { showNoteInput, setShowNoteInput, currentStep, addNote } = usePreviewMode();
  const [text, setText] = useState('');

  const handleSave = () => {
    if (!text.trim()) return;
    addNote(text.trim());
    setText('');
  };

  return (
    <Sheet open={showNoteInput} onOpenChange={setShowNoteInput}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="text-left mb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4 text-amber-500" />
            Note for Step {currentStep}
          </SheetTitle>
          <SheetDescription>Capture what needs to change.</SheetDescription>
        </SheetHeader>

        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What needs to change?"
          className="min-h-[80px] mb-4"
          autoFocus
        />

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={!text.trim()} className="flex-1 rounded-xl">
            Save Note
          </Button>
          <Button variant="outline" onClick={() => setShowNoteInput(false)} className="rounded-xl">
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
