import { useState, useCallback } from 'react';
import { Prospect, Sheet } from '@/types/prospect';

export type UndoAction = 
  | { type: 'delete_prospect'; data: Prospect }
  | { type: 'delete_prospects'; data: Prospect[] }
  | { type: 'update_prospect'; id: string; oldData: Partial<Prospect>; newData: Partial<Prospect> }
  | { type: 'rename_sheet'; id: string; oldName: string; newName: string };

interface UndoRedoState {
  undoStack: UndoAction[];
  redoStack: UndoAction[];
}

const MAX_HISTORY = 20;

export function useUndoRedo() {
  const [state, setState] = useState<UndoRedoState>({
    undoStack: [],
    redoStack: [],
  });

  const pushAction = useCallback((action: UndoAction) => {
    setState(prev => ({
      undoStack: [...prev.undoStack.slice(-MAX_HISTORY + 1), action],
      redoStack: [], // Clear redo stack on new action
    }));
  }, []);

  const popUndo = useCallback((): UndoAction | null => {
    let action: UndoAction | null = null;
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;
      const poppedAction = prev.undoStack[prev.undoStack.length - 1];
      action = poppedAction;
      return {
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, poppedAction],
      };
    });
    return action;
  }, []);

  const popRedo = useCallback((): UndoAction | null => {
    let action: UndoAction | null = null;
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;
      const poppedAction = prev.redoStack[prev.redoStack.length - 1];
      action = poppedAction;
      return {
        redoStack: prev.redoStack.slice(0, -1),
        undoStack: [...prev.undoStack, poppedAction],
      };
    });
    return action;
  }, []);

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  return {
    pushAction,
    popUndo,
    popRedo,
    canUndo,
    canRedo,
    undoCount: state.undoStack.length,
    redoCount: state.redoStack.length,
  };
}
