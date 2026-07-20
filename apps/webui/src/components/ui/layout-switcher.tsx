'use client';

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button, buttonClassName } from "@/components/ui/button";

export type AppLayoutMode = "full" | "sidebar" | "both" | "original";

export interface LayoutPreferences {
  contentWidth: number;
  mode: AppLayoutMode;
  onContentWidthChange: (width: number) => void;
  onModeChange: (mode: AppLayoutMode) => void;
  onSidebarWidthChange: (width: number) => void;
  sidebarWidth: number;
}

const layoutModes = ["full", "sidebar", "both", "original"] as const;

export const layoutWidthLimits = {
  sidebar: { min: 240, max: 420, step: 8 },
  content: { min: 768, max: 1600, step: 32 },
} as const;

function LayoutIcon({ mode }: { mode: AppLayoutMode }) {
  if (mode === "full") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M9 4H4v5M15 4h5v5M9 20H4v-5m11 5h5v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m8 8-4-4m12 4 4-4M8 16l-4 4m12-4 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (mode === "sidebar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <rect x="3.5" y="4" width="17" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 4v16M6 12h6m-6 0 2-2m-2 2 2 2m4-2-2-2m2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (mode === "both") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M4 9V4h5M15 4h5v5M4 15v5h5m6 0h5v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12h6m-6 0 2-2m-2 2 2 2m4-2-2-2m2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="6" y="5" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 9V6a3 3 0 0 1 3-3h3m12 6V6a3 3 0 0 0-3-3h-3M3 15v3a3 3 0 0 0 3 3h3m12-6v3a3 3 0 0 1-3 3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LayoutSwitcher({
  contentWidth,
  mode,
  onContentWidthChange,
  onModeChange,
  onSidebarWidthChange,
  sidebarWidth,
}: LayoutPreferences) {
  const t = useTranslations("header");
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const labels: Record<AppLayoutMode, string> = {
    full: t("layoutFull"),
    sidebar: t("layoutSidebarAdjustable"),
    both: t("layoutBothAdjustable"),
    original: t("layoutOriginal"),
  };

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <Button
        ref={triggerRef}
        onClick={() => setIsOpen((value) => !value)}
        size="icon-lg"
        aria-label={t("layout")}
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={t("layout")}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 9h18M9 9v11" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </Button>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("layout")}
          className="absolute right-0 top-full z-50 mt-2 w-80 animate-[fade-up_200ms_ease-out] rounded-2xl border border-line bg-panel p-4 shadow-[0_18px_40px_-24px_rgb(23_32_51_/_45%)] motion-reduce:animate-none"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-muted" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 9h18M9 9v11" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            {t("layout")}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{t("layoutHelp")}</p>

          <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-panel-muted p-1" role="group" aria-label={t("layout")}>
            {layoutModes.map((layoutMode) => (
              <button
                key={layoutMode}
                type="button"
                onClick={() => onModeChange(layoutMode)}
                className={buttonClassName({
                  className: "h-11 px-0",
                  size: "md",
                  variant: mode === layoutMode ? "primary" : "ghost",
                })}
                aria-label={labels[layoutMode]}
                aria-pressed={mode === layoutMode}
                title={labels[layoutMode]}
              >
                <LayoutIcon mode={layoutMode} />
              </button>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold text-muted">
              {t("sidebarWidth")}
              <output className="font-mono font-medium text-ink">{sidebarWidth}px</output>
            </span>
            <input
              type="range"
              min={layoutWidthLimits.sidebar.min}
              max={layoutWidthLimits.sidebar.max}
              step={layoutWidthLimits.sidebar.step}
              value={sidebarWidth}
              onChange={(event) => onSidebarWidthChange(Number(event.target.value))}
              className="mt-2 h-2 w-full cursor-pointer accent-accent"
            />
          </label>

          {mode === "both" ? (
            <label className="mt-4 block border-t border-line pt-4">
              <span className="flex items-center justify-between gap-3 text-xs font-semibold text-muted">
                {t("contentWidth")}
                <output className="font-mono font-medium text-ink">{contentWidth}px</output>
              </span>
              <input
                type="range"
                min={layoutWidthLimits.content.min}
                max={layoutWidthLimits.content.max}
                step={layoutWidthLimits.content.step}
                value={contentWidth}
                onChange={(event) => onContentWidthChange(Number(event.target.value))}
                className="mt-2 h-2 w-full cursor-pointer accent-accent"
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
