'use client';

import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useEffect, useRef, useState } from "react";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { AppHeader } from "@/components/ui/app-header";
import { Button } from "@/components/ui/button";
import {
  layoutWidthLimits,
  type AppLayoutMode,
} from "@/components/ui/layout-switcher";

interface AppShellProps {
  children: ReactNode;
  navigation: ReactNode;
}

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const minSidebarWidth = layoutWidthLimits.sidebar.min;
const maxSidebarWidth = layoutWidthLimits.sidebar.max;
const defaultSidebarWidth = 320;
const minContentWidth = layoutWidthLimits.content.min;
const maxContentWidth = layoutWidthLimits.content.max;
const defaultContentWidth = 1152;
const defaultLayoutMode: AppLayoutMode = "original";
const sidebarWidthStorageKey = "i0c.cc:webui:sidebar-width";
const contentWidthStorageKey = "i0c.cc:webui:content-width";
const layoutModeStorageKey = "i0c.cc:webui:layout-mode";

function clampSidebarWidth(width: number): number {
  return Math.min(maxSidebarWidth, Math.max(minSidebarWidth, width));
}

function clampContentWidth(width: number): number {
  return Math.min(maxContentWidth, Math.max(minContentWidth, width));
}

function isAppLayoutMode(value: string | null): value is AppLayoutMode {
  return value === "full" || value === "sidebar" || value === "both" || value === "original";
}

function persistLayoutPreference(key: string, value: string | number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

export function AppShell({ children, navigation }: AppShellProps) {
  const tHeader = useTranslations("header");
  const tCommon = useTranslations("common");
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<AppLayoutMode>(defaultLayoutMode);
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const [contentWidth, setContentWidth] = useState(defaultContentWidth);
  const [isLayoutTransitioning, setIsLayoutTransitioning] = useState(false);
  const sidebarWidthRef = useRef(defaultSidebarWidth);
  const layoutTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const resizeSessionRef = useRef<{
    pointerId: number;
    startWidth: number;
    startX: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (layoutTransitionTimerRef.current) {
        clearTimeout(layoutTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const storedWidth = Number(window.localStorage.getItem(sidebarWidthStorageKey));
        if (Number.isFinite(storedWidth) && storedWidth > 0) {
          const nextWidth = clampSidebarWidth(storedWidth);
          sidebarWidthRef.current = nextWidth;
          setSidebarWidth(nextWidth);
        }

        const storedContentWidth = Number(window.localStorage.getItem(contentWidthStorageKey));
        if (Number.isFinite(storedContentWidth) && storedContentWidth > 0) {
          const nextContentWidth = clampContentWidth(storedContentWidth);
          setContentWidth(nextContentWidth);
        }

        const storedLayoutMode = window.localStorage.getItem(layoutModeStorageKey);
        if (isAppLayoutMode(storedLayoutMode)) {
          setLayoutMode(storedLayoutMode);
        }
      } catch {
        // Keep the defaults when local storage is unavailable.
      }
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsNavigationOpen(false);
      }
    };

    desktopQuery.addEventListener("change", handleDesktopChange);
    return () => desktopQuery.removeEventListener("change", handleDesktopChange);
  }, []);

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
        setIsNavigationOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      root.style.overflow = previousOverflow;
      triggerElement?.focus();
    };
  }, [isNavigationOpen]);

  const closeNavigation = () => setIsNavigationOpen(false);

  const handleNavigationClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest("a, [data-navigation-close='true']")) {
      closeNavigation();
    }
  };

  const handleDrawerKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
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
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeSessionRef.current = {
      pointerId: event.pointerId,
      startWidth: sidebarWidthRef.current,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleResizePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    const nextWidth = clampSidebarWidth(session.startWidth + event.clientX - session.startX);
    sidebarWidthRef.current = nextWidth;
    setSidebarWidth(nextWidth);
  };

  const finishSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    persistLayoutPreference(sidebarWidthStorageKey, sidebarWidthRef.current);
    resizeSessionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const handleResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextWidth = clampSidebarWidth(sidebarWidthRef.current + direction * 16);
    sidebarWidthRef.current = nextWidth;
    setSidebarWidth(nextWidth);
    persistLayoutPreference(sidebarWidthStorageKey, nextWidth);
  };

  const handleSidebarWidthChange = (width: number) => {
    const nextWidth = clampSidebarWidth(width);
    sidebarWidthRef.current = nextWidth;
    setSidebarWidth(nextWidth);
    persistLayoutPreference(sidebarWidthStorageKey, nextWidth);
  };

  const handleContentWidthChange = (width: number) => {
    const nextWidth = clampContentWidth(width);
    setContentWidth(nextWidth);
    persistLayoutPreference(contentWidthStorageKey, nextWidth);
  };

  const handleLayoutModeChange = (mode: AppLayoutMode) => {
    if (mode === layoutMode) {
      return;
    }

    if (layoutTransitionTimerRef.current) {
      clearTimeout(layoutTransitionTimerRef.current);
    }

    setIsLayoutTransitioning(true);
    setLayoutMode(mode);
    persistLayoutPreference(layoutModeStorageKey, mode);
    layoutTransitionTimerRef.current = setTimeout(() => {
      setIsLayoutTransitioning(false);
      layoutTransitionTimerRef.current = null;
    }, 320);
  };

  const layoutGutter = layoutMode === "original"
    ? "max(0px, calc((100vw - 90rem) / 2))"
    : "0px";
  const contentMaxWidth = layoutMode === "full"
    ? "100%"
    : layoutMode === "both"
      ? `${contentWidth}px`
      : "72rem";

  const shellStyle = {
    "--app-header-max-width": layoutMode === "original" ? "90rem" : "100%",
    "--app-sidebar-width": `${sidebarWidth}px`,
    "--app-layout-gutter": layoutGutter,
    "--app-content-max-width": contentMaxWidth,
  } as CSSProperties;

  return (
    <div
      data-app-shell
      data-layout-transitioning={isLayoutTransitioning ? "true" : "false"}
      className="min-h-dvh bg-canvas text-ink"
      style={shellStyle}
    >
      <AppHeader
        navigationToggle={{
          isOpen: isNavigationOpen,
          onToggle: () => setIsNavigationOpen((isOpen) => !isOpen),
        }}
        layoutPreferences={{
          contentWidth,
          mode: layoutMode,
          onContentWidthChange: handleContentWidthChange,
          onModeChange: handleLayoutModeChange,
          onSidebarWidthChange: handleSidebarWidthChange,
          sidebarWidth,
        }}
      />

      <aside
        aria-label={tHeader("primaryNavigation")}
        data-layout-region="sidebar"
        className="fixed bottom-0 left-0 top-[4.5rem] z-30 hidden w-[calc(var(--app-layout-gutter)+var(--app-sidebar-width))] border-r border-line bg-panel-muted/55 lg:flex lg:flex-col"
      >
        <div
          data-layout-region="sidebar-content"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pl-[var(--app-layout-gutter)]"
        >
          {navigation}
        </div>
        <div
          role="separator"
          tabIndex={0}
          aria-label={tHeader("resizeNavigation")}
          aria-orientation="vertical"
          aria-valuemin={minSidebarWidth}
          aria-valuemax={maxSidebarWidth}
          aria-valuenow={sidebarWidth}
          onKeyDown={handleResizeKeyDown}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={finishSidebarResize}
          onPointerCancel={finishSidebarResize}
          onLostPointerCapture={finishSidebarResize}
          className="group absolute bottom-0 right-[-4px] top-0 z-10 w-2 cursor-col-resize touch-none outline-none"
        >
          <span className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-transparent transition group-hover:bg-accent group-focus-visible:bg-accent" />
        </div>
      </aside>

      {isNavigationOpen ? (
        <div className="fixed inset-0 z-[1100] lg:hidden">
          <div
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-[backdrop-in_180ms_ease-out] motion-reduce:animate-none"
            aria-hidden="true"
            onClick={closeNavigation}
          />
          <aside
            ref={drawerRef}
            id="app-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={tHeader("primaryNavigation")}
            onKeyDown={handleDrawerKeyDown}
            className="relative flex h-dvh w-[calc(100vw-1rem)] max-w-md flex-col border-r border-line bg-panel shadow-[24px_0_64px_-32px_rgb(23_32_51_/_45%)] animate-[drawer-in_220ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
          >
            <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-line px-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src="/logo.ico"
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-xl border border-line bg-panel-muted"
                />
                <span className="truncate text-sm font-semibold tracking-tight text-ink">
                  {tHeader("console")}
                </span>
              </div>
              <Button
                ref={closeButtonRef}
                onClick={closeNavigation}
                size="icon"
                aria-label={tCommon("close")}
                title={tCommon("close")}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </Button>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              onClickCapture={handleNavigationClick}
            >
              {navigation}
            </div>
          </aside>
        </div>
      ) : null}

      <div
        data-layout-region="content-frame"
        className="lg:pl-[calc(var(--app-layout-gutter)+var(--app-sidebar-width))] lg:pr-[var(--app-layout-gutter)]"
      >
        {children}
      </div>
    </div>
  );
}
