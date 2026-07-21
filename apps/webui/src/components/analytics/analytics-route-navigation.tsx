import Link from "next/link"
import { useTranslations } from "next-intl"

import { buildAnalyticsHref } from "@/components/analytics/links"
import type {
  AnalyticsRange,
  AnalyticsScopeViewModel,
} from "@/components/analytics/types"
import { buttonClassName } from "@/components/ui/button"
import { sidebarItemClassName } from "@/components/ui/sidebar-item"

interface AnalyticsRouteNavigationProps {
  basePath: string
  range: AnalyticsRange
  scope: AnalyticsScopeViewModel
  isAutomationActive?: boolean
}

interface EntryDomainNavigationProps {
  basePath: string
  range: AnalyticsRange
  scope: AnalyticsScopeViewModel
}

function EntryDomainNavigation({
  basePath,
  range,
  scope,
}: EntryDomainNavigationProps) {
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
              <svg
                viewBox="0 0 20 20"
                fill="none"
                className="h-4 w-4 shrink-0 text-muted"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M3.8 10h12.4M10 3.5c1.6 1.8 2.4 4 2.4 6.5s-.8 4.7-2.4 6.5M10 3.5C8.4 5.3 7.6 7.5 7.6 10s.8 4.7 2.4 6.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
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
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                d="M4 15V9m6 6V5m6 10v-3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span className="min-w-0 truncate">{t("navigation.overview")}</span>
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
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                d="M6 8V6.5a4 4 0 0 1 8 0V8M4.5 8h11v7.5h-11V8Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 12h.01M12 12h.01"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span className="min-w-0 truncate">{t("navigation.automation")}</span>
          </Link>
        </nav>
      </section>
    </div>
  )
}
