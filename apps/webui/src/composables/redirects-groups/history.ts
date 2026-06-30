'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type CloneFn<T> = (value: T) => T;

function defaultClone<T>(value: T): T {
  const sc = (globalThis as unknown as { structuredClone?: (v: unknown) => unknown }).structuredClone;
  if (typeof sc === "function") {
    return sc(value) as T;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function useUndoRedo<T>(options: {
  getCurrentSnapshot: () => T;
  applySnapshot: (snapshot: T) => void;
  maxHistory?: number;
  clone?: CloneFn<T>;
}) {
  const maxHistory = options.maxHistory ?? 50;

  const getCurrentSnapshotRef = useLatestRef(options.getCurrentSnapshot);
  const applySnapshotRef = useLatestRef(options.applySnapshot);
  const cloneRef = useLatestRef(options.clone ?? defaultClone<T>);

  const [undoStack, setUndoStack] = useState<T[]>([]);
  const [redoStack, setRedoStack] = useState<T[]>([]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const resetHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const pushSnapshot = useCallback(
    (snapshot: T) => {
      const cloned = cloneRef.current(snapshot);
      setUndoStack((prev) => {
        const next = [...prev, cloned];
        return next.length > maxHistory ? next.slice(next.length - maxHistory) : next;
      });
      setRedoStack([]);
    },
    [maxHistory, cloneRef]
  );

  const pushCurrentSnapshot = useCallback(() => {
    pushSnapshot(getCurrentSnapshotRef.current());
  }, [getCurrentSnapshotRef, pushSnapshot]);

  const undo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) {
        return prevUndo;
      }

      const snapshot = prevUndo[prevUndo.length - 1];
      const nextUndo = prevUndo.slice(0, -1);

      setRedoStack((prevRedo) => [
        cloneRef.current(getCurrentSnapshotRef.current()),
        ...prevRedo,
      ]);

      applySnapshotRef.current(cloneRef.current(snapshot));
      return nextUndo;
    });
  }, [applySnapshotRef, cloneRef, getCurrentSnapshotRef]);

  const redo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) {
        return prevRedo;
      }

      const snapshot = prevRedo[0];
      const nextRedo = prevRedo.slice(1);

      setUndoStack((prevUndo) => {
        const next = [...prevUndo, cloneRef.current(getCurrentSnapshotRef.current())];
        return next.length > maxHistory ? next.slice(next.length - maxHistory) : next;
      });

      applySnapshotRef.current(cloneRef.current(snapshot));
      return nextRedo;
    });
  }, [applySnapshotRef, cloneRef, getCurrentSnapshotRef, maxHistory]);

  return useMemo(
    () => ({
      canUndo,
      canRedo,
      undo,
      redo,
      pushSnapshot,
      pushCurrentSnapshot,
      resetHistory,
    }),
    [canRedo, canUndo, pushCurrentSnapshot, pushSnapshot, redo, resetHistory, undo]
  );
}
