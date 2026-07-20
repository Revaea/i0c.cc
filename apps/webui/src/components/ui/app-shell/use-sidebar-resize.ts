'use client';

import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useRef } from "react";

import { layoutWidthLimits } from "@/components/ui/layout-switcher";

interface UseSidebarResizeOptions {
  onSidebarWidthChange: (width: number) => void;
  previewSidebarWidth: (width: number) => void;
  sidebarWidth: number;
}

const minSidebarWidth = layoutWidthLimits.sidebar.min;
const maxSidebarWidth = layoutWidthLimits.sidebar.max;

function clampSidebarWidth(width: number): number {
  return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, width));
}

export function useSidebarResize({
  onSidebarWidthChange,
  previewSidebarWidth,
  sidebarWidth,
}: UseSidebarResizeOptions) {
  const sidebarWidthRef = useRef(sidebarWidth);
  const resizeSessionRef = useRef<{
    pointerId: number;
    startWidth: number;
    startX: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const handleResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeSessionRef.current = {
      pointerId: event.pointerId,
      startWidth: sidebarWidthRef.current,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const handleResizePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const nextWidth = clampSidebarWidth(session.startWidth + event.clientX - session.startX);
    sidebarWidthRef.current = nextWidth;
    previewSidebarWidth(nextWidth);
  }, [previewSidebarWidth]);

  const finishSidebarResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    onSidebarWidthChange(sidebarWidthRef.current);
    resizeSessionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [onSidebarWidthChange]);

  const handleResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextWidth = clampSidebarWidth(sidebarWidthRef.current + direction * 16);
    sidebarWidthRef.current = nextWidth;
    onSidebarWidthChange(nextWidth);
  }, [onSidebarWidthChange]);

  return {
    finishSidebarResize,
    handleResizeKeyDown,
    handleResizePointerDown,
    handleResizePointerMove,
    maxSidebarWidth,
    minSidebarWidth,
  };
}
