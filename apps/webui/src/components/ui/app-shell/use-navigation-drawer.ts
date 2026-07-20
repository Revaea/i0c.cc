'use client';

import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useNavigationDrawer() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeNavigation = useCallback(() => {
    setIsNavigationOpen(false);
  }, []);

  const toggleNavigation = useCallback(() => {
    setIsNavigationOpen((isOpen) => !isOpen);
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeNavigation();
      }
    };

    desktopQuery.addEventListener("change", handleDesktopChange);
    return () => desktopQuery.removeEventListener("change", handleDesktopChange);
  }, [closeNavigation]);

  useEffect(() => {
    if (!isNavigationOpen) {
      return;
    }

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const triggerElement = document.getElementById("app-navigation-trigger");
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeNavigation();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      root.style.overflow = previousOverflow;
      triggerElement?.focus();
    };
  }, [closeNavigation, isNavigationOpen]);

  const handleNavigationClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest("a, [data-navigation-close='true']")) {
      closeNavigation();
    }
  }, [closeNavigation]);

  const handleDrawerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const drawer = drawerRef.current;
    if (!drawer) {
      return;
    }

    const focusableElements = Array.from(
      drawer.querySelectorAll<HTMLElement>(focusableSelector),
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, []);

  return {
    closeButtonRef,
    closeNavigation,
    drawerRef,
    handleDrawerKeyDown,
    handleNavigationClick,
    isNavigationOpen,
    toggleNavigation,
  };
}
