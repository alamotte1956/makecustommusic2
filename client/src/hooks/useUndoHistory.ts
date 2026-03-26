import { useState, useCallback, useRef, useEffect } from "react";

/**
 * A snapshot-based undo/redo hook.
 *
 * Tracks a history stack of serialised snapshots. Each time `pushSnapshot` is
 * called the current state is deep-cloned and pushed onto the past stack while
 * the future stack is cleared.
 *
 * Content-edit debouncing: for rapid keystroke changes (typing in a textarea)
 * callers should use `pushSnapshotDebounced` which coalesces pushes within a
 * configurable window so that undo steps feel natural rather than per-character.
 *
 * @param initialState  The initial state value.
 * @param maxHistory    Maximum number of undo steps to keep (default 50).
 * @param debounceMs    Debounce window for `pushSnapshotDebounced` (default 800ms).
 */
export function useUndoHistory<T>(
  initialState: T,
  maxHistory = 50,
  debounceMs = 800,
) {
  const [state, setState] = useState<T>(initialState);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Force re-render when past/future change (for canUndo/canRedo)
  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender(v => v + 1), []);

  /** Deep clone via structuredClone (available in all modern browsers). */
  const clone = useCallback((v: T): T => structuredClone(v), []);

  /**
   * Push the current state onto the undo stack and set a new state.
   * Clears the redo stack.
   */
  const pushSnapshot = useCallback(
    (next: T) => {
      // Cancel any pending debounced push
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      pastRef.current = [...pastRef.current, clone(state)].slice(-maxHistory);
      futureRef.current = [];
      setState(next);
      bump();
    },
    [state, clone, maxHistory, bump],
  );

  /**
   * Like pushSnapshot but coalesces rapid calls within `debounceMs`.
   * The *first* call in a burst immediately snapshots the pre-edit state,
   * then subsequent calls within the window only update the live state
   * without creating extra history entries.
   */
  const pushSnapshotDebounced = useCallback(
    (next: T) => {
      if (!debounceTimerRef.current) {
        // First call in burst — snapshot the current (pre-edit) state
        pastRef.current = [...pastRef.current, clone(state)].slice(-maxHistory);
        futureRef.current = [];
        bump();
      } else {
        clearTimeout(debounceTimerRef.current);
      }

      setState(next);

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [state, clone, maxHistory, debounceMs, bump],
  );

  /** Undo: pop the last state from past and push current onto future. */
  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;

    // Flush any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, clone(state)];
    setState(prev);
    bump();
  }, [state, clone, bump]);

  /** Redo: pop the last state from future and push current onto past. */
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    // Flush any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, clone(state)];
    setState(next);
    bump();
  }, [state, clone, bump]);

  /** Reset history (e.g. when loading a draft or clearing). */
  const resetHistory = useCallback(
    (newState: T) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      pastRef.current = [];
      futureRef.current = [];
      setState(newState);
      bump();
    },
    [bump],
  );

  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const historySize = pastRef.current.length;

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return {
    state,
    setState, // direct set without history (for non-undoable changes)
    pushSnapshot,
    pushSnapshotDebounced,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
    historySize,
  };
}
