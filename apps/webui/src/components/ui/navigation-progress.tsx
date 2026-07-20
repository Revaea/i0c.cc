"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PageLoadingBar } from "@/components/ui/page-loading-bar";

const minimumVisibleDuration = 500;
const maximumVisibleDuration = 60_000;

function hasModifierKey(event: MouseEvent | KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function getNavigationAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const anchor = target.closest("a[href]");

  return anchor instanceof HTMLAnchorElement ? anchor : null;
}

function isInternalRouteChange(anchor: HTMLAnchorElement | null): boolean {
  if (!anchor) {
    return false;
  }

  if (
    anchor.hasAttribute("download") ||
    (anchor.target && anchor.target !== "_self")
  ) {
    return false;
  }

  const destination = new URL(anchor.href, window.location.href);
  const current = new URL(window.location.href);

  return (
    destination.origin === current.origin &&
    (destination.pathname !== current.pathname ||
      destination.search !== current.search)
  );
}

function shouldTrackPointerNavigation(
  event: PointerEvent,
  anchor: HTMLAnchorElement,
): boolean {
  return (
    event.button === 0 &&
    !hasModifierKey(event) &&
    isInternalRouteChange(anchor)
  );
}

function shouldTrackKeyboardNavigation(
  event: KeyboardEvent,
  anchor: HTMLAnchorElement,
): boolean {
  return (
    event.key === "Enter" &&
    !hasModifierKey(event) &&
    isInternalRouteChange(anchor)
  );
}

function getNavigationRouteKey(anchor: HTMLAnchorElement): string {
  const destination = new URL(anchor.href, window.location.href);

  return `${destination.pathname}?${destination.searchParams.toString()}`;
}

export function NavigationProgress() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [isVisible, setIsVisible] = useState(false);
  const [startToken, setStartToken] = useState(0);
  const startedAtRef = useRef(0);
  const targetRouteKeyRef = useRef(routeKey);
  const completionTimerRef = useRef<number | null>(null);
  const maximumTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function startNavigation(targetRouteKey: string) {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
      if (maximumTimerRef.current !== null) {
        window.clearTimeout(maximumTimerRef.current);
      }

      startedAtRef.current = performance.now();
      targetRouteKeyRef.current = targetRouteKey;
      flushSync(() => {
        setStartToken((currentToken) => currentToken + 1);
        setIsVisible(true);
      });
      maximumTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
        maximumTimerRef.current = null;
      }, maximumVisibleDuration);
    }

    function handlePointerDown(event: PointerEvent) {
      const anchor = getNavigationAnchor(event.target);

      if (anchor && shouldTrackPointerNavigation(event, anchor)) {
        startNavigation(getNavigationRouteKey(anchor));
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      const anchor = getNavigationAnchor(event.target);

      if (anchor && shouldTrackKeyboardNavigation(event, anchor)) {
        startNavigation(getNavigationRouteKey(anchor));
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [routeKey]);

  useEffect(() => {
    if (!isVisible || routeKey !== targetRouteKeyRef.current) {
      return;
    }

    const elapsed = performance.now() - startedAtRef.current;
    const remaining = Math.max(0, minimumVisibleDuration - elapsed);

    completionTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      completionTimerRef.current = null;
      if (maximumTimerRef.current !== null) {
        window.clearTimeout(maximumTimerRef.current);
        maximumTimerRef.current = null;
      }
    }, remaining);

    return () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, [isVisible, routeKey]);

  useEffect(
    () => () => {
      if (completionTimerRef.current !== null) {
        window.clearTimeout(completionTimerRef.current);
      }
      if (maximumTimerRef.current !== null) {
        window.clearTimeout(maximumTimerRef.current);
      }
    },
    [],
  );

  return (
    <PageLoadingBar
      label={t("loading")}
      isVisible={isVisible}
      startToken={startToken}
    />
  );
}
