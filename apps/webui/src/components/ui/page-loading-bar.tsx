"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

interface PageLoadingBarProps {
  label: string;
  announce?: boolean;
  isVisible?: boolean;
  startToken?: number;
}

type LoadingBarPhase =
  | "hidden"
  | "loading"
  | "restarting"
  | "completing"
  | "fading";

const completionDuration = 180;
const fadeDuration = 180;
const restartDuration = 180;

function subscribeToPortalTarget(): () => void {
  return () => {};
}

function getPortalTarget(): HTMLElement {
  return document.body;
}

function getServerPortalTarget(): null {
  return null;
}

function getIndicatorClassName(phase: LoadingBarPhase): string {
  switch (phase) {
    case "loading":
      return "page-loading-bar-indicator";
    case "restarting":
      return "page-loading-bar-indicator-restart";
    case "hidden":
      return "page-loading-bar-indicator-hidden";
    default:
      return "page-loading-bar-indicator-complete";
  }
}

export function PageLoadingBar({
  label,
  announce = true,
  isVisible = true,
  startToken = 0,
}: PageLoadingBarProps) {
  const [phase, setPhase] = useState<LoadingBarPhase>(
    isVisible ? "loading" : "hidden",
  );
  const phaseRef = useRef<LoadingBarPhase>(phase);
  const completionTimerRef = useRef<number | null>(null);
  const portalTarget = useSyncExternalStore(
    subscribeToPortalTarget,
    getPortalTarget,
    getServerPortalTarget,
  );

  useEffect(() => {
    const updatePhase = (nextPhase: LoadingBarPhase) => {
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
    };

    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }

    if (isVisible) {
      if (
        phaseRef.current === "completing" ||
        phaseRef.current === "fading"
      ) {
        updatePhase("restarting");
        completionTimerRef.current = window.setTimeout(() => {
          updatePhase("loading");
          completionTimerRef.current = null;
        }, restartDuration);

        return () => {
          if (completionTimerRef.current !== null) {
            window.clearTimeout(completionTimerRef.current);
            completionTimerRef.current = null;
          }
        };
      }

      updatePhase("loading");
      return;
    }

    if (phaseRef.current === "hidden") {
      return;
    }

    updatePhase("completing");
    completionTimerRef.current = window.setTimeout(() => {
      updatePhase("fading");
      completionTimerRef.current = window.setTimeout(() => {
        updatePhase("hidden");
        completionTimerRef.current = null;
      }, fadeDuration);
    }, completionDuration);

    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, [isVisible, startToken]);

  if (!portalTarget) {
    return null;
  }

  const isOpaque =
    phase === "loading" ||
    phase === "restarting" ||
    phase === "completing";
  const indicatorClassName = getIndicatorClassName(phase);

  return createPortal(
    <>
      <span
        aria-hidden="true"
        data-page-loading-bar=""
        data-state={phase}
        className={`pointer-events-none fixed inset-x-0 top-0 z-[1200] h-[3px] overflow-hidden transition-opacity duration-[180ms] ${
          isOpaque ? "opacity-100" : "opacity-0"
        }`}
      >
        <span
          className={`page-loading-bar-progress absolute inset-y-0 left-0 w-full bg-accent ${indicatorClassName}`}
        />
      </span>
      {announce && isVisible ? (
        <span className="sr-only" role="status">{label}</span>
      ) : null}
    </>,
    portalTarget,
  );
}
