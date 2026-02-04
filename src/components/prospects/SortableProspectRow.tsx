import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Prospect } from '@/types/prospect';
import { ProspectRow } from './ProspectRow';

interface SortableProspectRowProps {
  prospect: Prospect;
  index: number;
  isCalling: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean | Prospect | null>;
  isEven: boolean;
  columnOrder: string[];
  isMobileTable?: boolean;
  selectionModeActive: boolean;
  showSelection?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  disableDrag?: boolean;
  isLastContacted?: boolean;
  onMarkLastContacted?: () => void;
}

export const SortableProspectRow = memo(function SortableProspectRow(props: SortableProspectRowProps) {
  const { disableDrag = false } = props;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: props.prospect.id,
    disabled: disableDrag,
  });

  const style = disableDrag ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const dragHandleProps = disableDrag ? undefined : {
    ref: setNodeRef,
    style,
    attributes,
    listeners,
    isDragging,
  };

  return (
    <ProspectRow
      {...props}
      dragHandleProps={dragHandleProps}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render when these specific props change
  return (
    prevProps.prospect.id === nextProps.prospect.id &&
    prevProps.prospect.action_taken === nextProps.prospect.action_taken &&
    prevProps.prospect.funnel_stage === nextProps.prospect.funnel_stage &&
    prevProps.prospect.name === nextProps.prospect.name &&
    prevProps.prospect.phone === nextProps.prospect.phone &&
    prevProps.index === nextProps.index &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isEven === nextProps.isEven &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isLastContacted === nextProps.isLastContacted &&
    prevProps.showSelection === nextProps.showSelection &&
    prevProps.isMobileTable === nextProps.isMobileTable &&
    prevProps.disableDrag === nextProps.disableDrag
  );
});