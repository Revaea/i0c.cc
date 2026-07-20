import type { ReactNode } from "react"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { AnalyticsRefreshButton } from "@/components/analytics/analytics-refresh-button"
import { buildAnalyticsHref } from "@/components/analytics/links"
import {
  analyticsRanges,
  type AnalyticsRange,
  type AnalyticsScopeViewModel,
} from "@/components/analytics/types"
import { AppSectionNavigation } from "@/components/ui/app-section-navigation"
import { AppShell } from "@/components/ui/app-shell"
import { buttonClassName } from "@/components/ui/button"
import { LinkPendingIndicator } from "@/components/ui/link-pending-indicator"
import { sidebarItemClassName } from "@/components/ui/sidebar-item"
import { refreshAnalytics } from "@/lib/analytics/actions"

interface AnalyticsShellProps {
  children: ReactNode
  navigation?: ReactNode
}

interface AnalyticsPageHeaderProps {
  backAction?: {
    href: string
    label: string
  }
  entryDomain?: string
  range: AnalyticsRange
  rangeBasePath: string
  showRefresh?: boolean
}

interface AnalyticsRouteNavigationProps {
  basePath: string
  range: AnalyticsRange
  scope: AnalyticsScopeViewModel
  isAutomationActive?: boolean
}

interface AnalyticsStatePanelProps {
  title: string
  description: string
  action?: {
    href: string
    label: string
  }
}

export function AnalyticsShell({ children, navigation }: AnalyticsShellProps) {
  const navigationContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 p-5 sm:p-6">
        <AppSectionNavigation />
      </div>
      {navigation}
    </div>
  )

  return (
    <AppShell navigation={navigationContent}>
      <main data-layout-region="content" className="mx-auto w-full max-w-[var(--app-content-max-width)] px-5 py-7 sm:px-8 sm:py-10 lg:px-10">
        {children}
      </main>
    </AppShell>
  )
}

export function AnalyticsPageHeader({
  backAction,
  entryDomain = "all",
  range,
  rangeBasePath,
  showRefresh = true,
}: AnalyticsPageHeaderProps) {
  const t = useTranslations("analytics")

  return (
    <div
      className={`mb-6 flex flex-wrap items-center gap-3 border-b border-line pb-5 ${
        backAction ? "justify-between" : "justify-end"
      }`}
    >
      {backAction ? (
        <Link
          href={backAction.href}
          className={buttonClassName({ className: "relative", size: "sm", variant: "secondary" })}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="m11.5 5-5 5 5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {backAction.label}
          <LinkPendingIndicator label={t("states.loading")} />
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {showRefresh ? (
          <form action={refreshAnalytics} className="flex">
            <AnalyticsRefreshButton
              label={t("refresh.label")}
              pendingLabel={t("refresh.pending")}
            />
          </form>
        ) : null}
        <RangeFilter
          range={range}
          basePath={rangeBasePath}
          entryDomain={entryDomain}
        />
      </div>
    </div>
  )
}

function EntryDomainNavigation({
  basePath,
  range,
  scope,
}: {
  basePath: string
  range: AnalyticsRange
  scope: AnalyticsScopeViewModel
}) {
  const t = useTranslations("analytics")
  const orderedEntryDomains = [
    ...scope.availableEntryDomains.filter((option) => option.value === "unknown"),
    ...scope.availableEntryDomains.filter((option) => option.value !== "unknown"),
  ]
  const options = [
    { value: "all", label: t("filters.allDomains") },
    ...orderedEntryDomains.map((option) => ({
      value: option.value,
      label: option.value === "unknown" ? t("filters.unknownDomain") : option.value,
    })),
  ]

  return (
    <section>
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {t("filters.entryDomain")}
      </p>
      <nav aria-label={t("filters.entryDomain")} className="space-y-1">
        {options.map((option) => {
          const isActive = option.value === scope.entryDomain

          return (
            <Link
              key={option.value}
              href={buildAnalyticsHref(basePath, {
                entryDomain: option.value,
                range,
              })}
              aria-current={isActive ? "true" : undefined}
              className={sidebarItemClassName({
                className: "relative min-w-0",
                isSelected: isActive,
              })}
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3.8 10h12.4M10 3.5c1.6 1.8 2.4 4 2.4 6.5s-.8 4.7-2.4 6.5M10 3.5C8.4 5.3 7.6 7.5 7.6 10s.8 4.7 2.4 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <LinkPendingIndicator label={t("states.loading")} />
            </Link>
          )
        })}
      </nav>
    </section>
  )
}

export function AnalyticsRouteNavigation({
  basePath,
  range,
  scope,
  isAutomationActive = false,
}: AnalyticsRouteNavigationProps) {
  const t = useTranslations("analytics")
  const entryDomain = scope.entryDomain
  const entryDomainBasePath = isAutomationActive ? `${basePath}/automation` : basePath
  const isOverviewActive = !isAutomationActive

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-5 py-5 sm:px-6">
        <EntryDomainNavigation
          basePath={entryDomainBasePath}
          range={range}
          scope={scope}
        />
      </div>

      <section className="shrink-0 border-t border-line px-5 py-4 sm:px-6 sm:py-5">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {t("navigation.analysis")}
        </p>
        <nav
          aria-label={t("navigation.analysis")}
          className="grid grid-cols-2 gap-1 rounded-xl bg-panel-muted p-1"
        >
          <Link
            href={buildAnalyticsHref(basePath, { entryDomain, range })}
            aria-current={isOverviewActive ? "page" : undefined}
            className={buttonClassName({
              className: "relative w-full min-w-0",
              size: "sm",
              variant: isOverviewActive ? "primary" : "ghost",
            })}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path
                d="M4 15V9m6 6V5m6 10v-3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span className="min-w-0 truncate">{t("navigation.overview")}</span>
            <LinkPendingIndicator label={t("states.loading")} />
          </Link>

          <Link
            href={buildAnalyticsHref(`${basePath}/automation`, { entryDomain, range })}
            aria-current={isAutomationActive ? "page" : undefined}
            className={buttonClassName({
              className: "relative w-full min-w-0",
              size: "sm",
              variant: isAutomationActive ? "primary" : "ghost",
            })}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path d="M6 8V6.5a4 4 0 0 1 8 0V8M4.5 8h11v7.5h-11V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 12h.01M12 12h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="min-w-0 truncate">{t("navigation.automation")}</span>
            <LinkPendingIndicator label={t("states.loading")} />
          </Link>
        </nav>
      </section>
    </div>
  )
}

export function RangeFilter({
  range,
  basePath,
  entryDomain,
}: {
  range: AnalyticsRange
  basePath: string
  entryDomain: string
}) {
  const t = useTranslations("analytics")

  return (
    <div
      className="grid w-fit grid-cols-4 gap-1 rounded-xl bg-panel-muted p-1"
      role="group"
      aria-label={t("range.label")}
    >
      {analyticsRanges.map((option) => {
        const isActive = option === range

        return (
          <Link
            key={option}
            href={buildAnalyticsHref(basePath, { entryDomain, range: option })}
            aria-current={isActive ? "page" : undefined}
            className={buttonClassName({
              className: "relative",
              size: "sm",
              variant: isActive ? "primary" : "ghost",
            })}
          >
            {t("range.days", { count: option })}
            <LinkPendingIndicator label={t("states.loading")} />
          </Link>
        )
      })}
    </div>
  )
}

export function AnalyticsStatePanel({ title, description, action }: AnalyticsStatePanelProps) {
  return (
    <section className="flex min-h-[24rem] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path
              d="M5 19V9m7 10V5m7 14v-7"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <h2 className="mt-5 text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        {action ? (
          <Link
            href={action.href}
            className={buttonClassName({ className: "mt-6", variant: "primary" })}
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </section>
  )
}
