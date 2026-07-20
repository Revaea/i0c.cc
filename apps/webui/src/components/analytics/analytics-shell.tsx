import type { ReactNode } from "react"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { buildAnalyticsHref } from "@/components/analytics/links"
import {
  analyticsRanges,
  type AnalyticsRankedLink,
  type AnalyticsRange,
  type AnalyticsScopeViewModel,
} from "@/components/analytics/types"
import { AppSectionNavigation } from "@/components/ui/app-section-navigation"
import { AppShell } from "@/components/ui/app-shell"
import { buttonClassName } from "@/components/ui/button"

interface AnalyticsShellProps {
  children: ReactNode
  navigation?: ReactNode
}

interface AnalyticsPageHeaderProps {
  range: AnalyticsRange
  rangeBasePath: string
  scope?: AnalyticsScopeViewModel
}

interface AnalyticsRouteNavigationProps {
  activeAnalyticsId?: string
  basePath: string
  links: AnalyticsRankedLink[]
  range: AnalyticsRange
  entryDomain: string
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
    <div className="space-y-4 p-5 sm:p-6">
      <AppSectionNavigation />
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
  range,
  rangeBasePath,
  scope,
}: AnalyticsPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap justify-end gap-3 border-b border-line pb-5">
      {scope ? (
        <EntryDomainFilter range={range} basePath={rangeBasePath} scope={scope} />
      ) : null}
      <RangeFilter
        range={range}
        basePath={rangeBasePath}
        entryDomain={scope?.entryDomain ?? "all"}
      />
    </div>
  )
}

export function AnalyticsRouteNavigation({
  activeAnalyticsId,
  basePath,
  links,
  range,
  entryDomain,
  isAutomationActive = false,
}: AnalyticsRouteNavigationProps) {
  const t = useTranslations("analytics")

  return (
    <section className="border-t border-line pt-5">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {t("navigation.routes")}
      </p>
      <nav aria-label={t("navigation.routes")} className="space-y-1">
        <Link
          href={buildAnalyticsHref(basePath, { entryDomain, range })}
          aria-current={!activeAnalyticsId && !isAutomationActive ? "page" : undefined}
          className={buttonClassName({
            className: "w-full justify-start",
            size: "sm",
            variant: !activeAnalyticsId && !isAutomationActive ? "selected" : "ghost",
          })}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M4 15V9m6 6V5m6 10v-3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="truncate">{t("navigation.overview")}</span>
        </Link>

        <Link
          href={buildAnalyticsHref(`${basePath}/automation`, { entryDomain, range })}
          aria-current={isAutomationActive ? "page" : undefined}
          className={buttonClassName({
            className: "w-full justify-start",
            size: "sm",
            variant: isAutomationActive ? "selected" : "ghost",
          })}
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M6 8V6.5a4 4 0 0 1 8 0V8M4.5 8h11v7.5h-11V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 12h.01M12 12h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="truncate">{t("navigation.automation")}</span>
        </Link>

        {links.map((link) => {
          const isActive = link.analyticsId === activeAnalyticsId

          return (
            <Link
              key={link.analyticsId}
              href={buildAnalyticsHref(
                `${basePath}/${encodeURIComponent(link.analyticsId)}`,
                { entryDomain, range },
              )}
              aria-current={isActive ? "page" : undefined}
              className={buttonClassName({
                className: "w-full min-w-0 justify-start",
                size: "sm",
                variant: isActive ? "selected" : "ghost",
              })}
              title={link.path}
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path
                  d="M6.5 10a3.5 3.5 0 0 1 3.5-3.5h2.5a3.5 3.5 0 1 1 0 7H11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M13.5 10A3.5 3.5 0 0 1 10 13.5H7.5a3.5 3.5 0 1 1 0-7H9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="min-w-0 flex-1 truncate font-mono">{link.path}</span>
            </Link>
          )
        })}
      </nav>
    </section>
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
      className="grid w-fit grid-cols-3 gap-1 rounded-xl bg-panel-muted p-1"
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
              size: "sm",
              variant: isActive ? "primary" : "ghost",
            })}
          >
            {t("range.days", { count: option })}
          </Link>
        )
      })}
    </div>
  )
}

export function EntryDomainFilter({
  range,
  basePath,
  scope,
}: {
  range: AnalyticsRange
  basePath: string
  scope: AnalyticsScopeViewModel
}) {
  const t = useTranslations("analytics")
  const options = [
    { value: "all", label: t("filters.allDomains") },
    ...scope.availableEntryDomains.map((option) => ({
      value: option.value,
      label: option.value === "unknown" ? t("filters.unknownDomain") : option.value,
    })),
  ]

  return (
    <div
      className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-panel-muted p-1"
      role="group"
      aria-label={t("filters.entryDomain")}
    >
      {options.map((option) => {
        const isActive = option.value === scope.entryDomain

        return (
          <Link
            key={option.value}
            href={buildAnalyticsHref(basePath, {
              entryDomain: option.value,
              range,
            })}
            aria-current={isActive ? "page" : undefined}
            className={buttonClassName({
              className: "shrink-0",
              size: "sm",
              variant: isActive ? "primary" : "ghost",
            })}
          >
            {option.label}
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
