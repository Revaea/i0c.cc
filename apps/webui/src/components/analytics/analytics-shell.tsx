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
import { sidebarItemClassName } from "@/components/ui/sidebar-item"

interface AnalyticsShellProps {
  children: ReactNode
  navigation?: ReactNode
}

interface AnalyticsPageHeaderProps {
  entryDomain?: string
  range: AnalyticsRange
  rangeBasePath: string
}

interface AnalyticsRouteNavigationProps {
  activeAnalyticsId?: string
  basePath: string
  links: AnalyticsRankedLink[]
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
  entryDomain = "all",
  range,
  rangeBasePath,
}: AnalyticsPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap justify-end gap-3 border-b border-line pb-5">
      <RangeFilter
        range={range}
        basePath={rangeBasePath}
        entryDomain={entryDomain}
      />
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
  const options = [
    { value: "all", label: t("filters.allDomains") },
    ...scope.availableEntryDomains.map((option) => ({
      value: option.value,
      label: option.value === "unknown" ? t("filters.unknownDomain") : option.value,
    })),
  ]

  return (
    <section className="border-t border-line pt-5">
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
              aria-current={isActive ? "page" : undefined}
              className={sidebarItemClassName({
                className: "min-w-0",
                isSelected: isActive,
              })}
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3.8 10h12.4M10 3.5c1.6 1.8 2.4 4 2.4 6.5s-.8 4.7-2.4 6.5M10 3.5C8.4 5.3 7.6 7.5 7.6 10s.8 4.7 2.4 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </Link>
          )
        })}
      </nav>
    </section>
  )
}

export function AnalyticsRouteNavigation({
  activeAnalyticsId,
  basePath,
  links,
  range,
  scope,
  isAutomationActive = false,
}: AnalyticsRouteNavigationProps) {
  const t = useTranslations("analytics")
  const entryDomain = scope.entryDomain

  return (
    <div className="space-y-5">
      <EntryDomainNavigation basePath={basePath} range={range} scope={scope} />
      <section className="border-t border-line pt-5">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {t("navigation.routes")}
        </p>
        <nav aria-label={t("navigation.routes")} className="space-y-1">
          <Link
            href={buildAnalyticsHref(basePath, { entryDomain, range })}
            aria-current={!activeAnalyticsId && !isAutomationActive ? "page" : undefined}
            className={sidebarItemClassName({
              isSelected: !activeAnalyticsId && !isAutomationActive,
            })}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
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
            className={sidebarItemClassName({
              isSelected: isAutomationActive,
            })}
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
              <path d="M6 8V6.5a4 4 0 0 1 8 0V8M4.5 8h11v7.5h-11V8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 12h.01M12 12h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
                className={sidebarItemClassName({
                  className: "min-w-0",
                  isSelected: isActive,
                })}
                title={link.path}
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted" aria-hidden="true">
                  <path
                    d="M6.5 10a3.5 3.5 0 0 1 3.5-3.5h2.5a3.5 3.5 0 1 1 0 7H11"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M13.5 10A3.5 3.5 0 0 1 10 13.5H7.5a3.5 3.5 0 1 1 0-7H9"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="min-w-0 flex-1 truncate">{link.path}</span>
              </Link>
            )
          })}
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
