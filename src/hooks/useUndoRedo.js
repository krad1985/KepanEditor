import { useState, useCallback } from 'react';
import { deepCloneKepanTree } from '../utils/treeUtils';

const MAX_HISTORY = 50;

export const useUndoRedo = (initialState) => {
  const [historyState, setHistoryState] = useState(() => ({
    past: [],
    present: deepCloneKepanTree(initialState),
    future: [],
  }));

  const commitChange = useCallback((updaterOrTree) => {
    setHistoryState((prev) => {
      const current = prev.present;
      const next = typeof updaterOrTree === 'function'
        ? updaterOrTree(deepCloneKepanTree(current))
        : updaterOrTree;
      if (next === current) return prev;
      return {
        past: [...prev.past, deepCloneKepanTree(current)].slice(-MAX_HISTORY),
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistoryState((prev) => {
      if (!prev.past.length) return prev;
      const past = [...prev.past];
      const prevTree = past.pop();
      return { past, present: prevTree, future: [deepCloneKepanTree(prev.present), ...prev.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryState((prev) => {
      if (!prev.future.length) return prev;
      const future = [...prev.future];
      const nextTree = future.shift();
      return { past: [...prev.past, deepCloneKepanTree(prev.present)], present: nextTree, future };
    });
  }, []);

  const reset = useCallback((newState) => {
    setHistoryState({ past: [], present: deepCloneKepanTree(newState), future: [] });
  }, []);

  return {
    present: historyState.present,
    commitChange, undo, redo, reset,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
  };
};
