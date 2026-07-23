"use client";

import type { MouseEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { sidebarItemClassName } from "@/components/ui/layout/sidebar-item";

export type AppSidebarSection = "rules" | "analytics" | "settings";

interface AppSidebarPrimaryNavigationProps {
  activeSection: AppSidebarSection;
  onBeforeNavigate?: (href: string) => boolean;
  onSelectAnalytics?: () => void;
  onSelectRules?: () => void;
  onSelectSettings?: () => void;
}

interface AppSidebarSectionHeaderProps {
  onBack: () => void;
  title: string;
}

interface AppSidebarSettingsNavigationProps {
  isActive?: boolean;
  onBeforeNavigate?: (href: string) => boolean;
  onSelect?: () => void;
}

interface PrimaryNavigationItemProps {
  children: ReactNode;
  hasChildren?: boolean;
  href: string;
  icon: ReactNode;
  isSelected: boolean;
  onBeforeNavigate?: (href: string) => boolean;
  onSelect?: () => void;
  shouldCloseOnSelect?: boolean;
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-muted"
      aria-hidden="true"
    >
      <path
        d="m8 5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrimaryNavigationItem({
  children,
  hasChildren,
  href,
  icon,
  isSelected,
  onBeforeNavigate,
  onSelect,
  shouldCloseOnSelect,
}: PrimaryNavigationItemProps) {
  const className = sidebarItemClassName({
    className: "justify-between px-3",
    isSelected,
  });
  const content = (
    <>
      <span className="inline-flex min-w-0 flex-1 items-center gap-3">
        {icon}
        <span className="truncate">{children}</span>
      </span>
      {hasChildren ? <ChevronIcon /> : null}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        data-navigation-close={shouldCloseOnSelect ? "true" : undefined}
        aria-current={isSelected ? "page" : undefined}
        className={className}
        onClick={onSelect}
      >
        {content}
      </button>
    );
  }

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (onBeforeNavigate?.(href) === false) {
      event.preventDefault();
    }
  }

  return (
    <Link
      href={href}
      data-navigation-close="true"
      aria-current={isSelected ? "page" : undefined}
      className={className}
      onClick={handleLinkClick}
    >
      {content}
    </Link>
  );
}

export function AppSidebarPrimaryNavigation({
  activeSection,
  onBeforeNavigate,
  onSelectAnalytics,
  onSelectRules,
  onSelectSettings,
}: AppSidebarPrimaryNavigationProps) {
  const t = useTranslations("header");

  return (
    <div className="flex h-full min-h-0 flex-col animate-[fade-left_180ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <nav aria-label={t("primaryNavigation")} className="space-y-1">
          <PrimaryNavigationItem
            href="/"
            icon={
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                <path d="M5 5h10M5 10h10M5 15h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            }
            isSelected={activeSection === "rules"}
            hasChildren
            onBeforeNavigate={onBeforeNavigate}
            onSelect={onSelectRules}
          >
            {t("rules")}
          </PrimaryNavigationItem>
          <PrimaryNavigationItem
            href="/analytics"
            icon={
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                <path d="M4 16V9m6 7V4m6 12v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            }
            isSelected={activeSection === "analytics"}
            hasChildren
            onBeforeNavigate={onBeforeNavigate}
            onSelect={onSelectAnalytics}
          >
            {t("analytics")}
          </PrimaryNavigationItem>
        </nav>
      </div>

      <AppSidebarSettingsNavigation
        isActive={activeSection === "settings"}
        onBeforeNavigate={onBeforeNavigate}
        onSelect={onSelectSettings}
      />
    </div>
  );
}

export function AppSidebarSettingsNavigation({
  isActive = false,
  onBeforeNavigate,
  onSelect,
}: AppSidebarSettingsNavigationProps) {
  const t = useTranslations("header");

  return (
    <nav
      aria-label={t("settings")}
      className="shrink-0 border-t border-line p-4 sm:p-5"
    >
      <PrimaryNavigationItem
        href="/?view=settings"
        icon={
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
            <path
              d="M10 3.25v1.5M10 15.25v1.5M16.75 10h-1.5M4.75 10h-1.5M14.77 5.23l-1.06 1.06M6.29 13.71l-1.06 1.06M14.77 14.77l-1.06-1.06M6.29 6.29 5.23 5.23"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="10" cy="10" r="3.25" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        }
        isSelected={isActive}
        onBeforeNavigate={onBeforeNavigate}
        onSelect={onSelect}
        shouldCloseOnSelect
      >
        {t("settings")}
      </PrimaryNavigationItem>
    </nav>
  );
}

export function AppSidebarSectionHeader({
  onBack,
  title,
}: AppSidebarSectionHeaderProps) {
  const t = useTranslations("header");

  return (
    <div className="flex h-[4.5rem] shrink-0 items-center border-b border-line px-4 sm:px-5">
      <div className="grid h-10 w-full grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={t("backToNavigation")}
          title={t("backToNavigation")}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="m12 4-6 6 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="truncate text-center text-sm font-semibold text-ink">{title}</h2>
        <span aria-hidden="true" />
      </div>
    </div>
  );
}
