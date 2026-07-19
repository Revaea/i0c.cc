import type { ReactNode } from "react"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { formatCount } from "@/components/analytics/format"
import {
  analyticsRanges,
  type AnalyticsRankedLink,
  type AnalyticsRange,
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
}

interface AnalyticsRouteNavigationProps {
  activeAnalyticsId?: string
  basePath: string
  links: AnalyticsRankedLink[]
  locale: string
  range: AnalyticsRange
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
}: AnalyticsPageHeaderProps) {
  return (
    <div className="mb-6 flex justify-end border-b border-line pb-5">
      <RangeFilter range={range} basePath={rangeBasePath} />
    </div>
  )
}

export function AnalyticsRouteNavigation({
  activeAnalyticsId,
  basePath,
  links,
  locale,
  range,
}: AnalyticsRouteNavigationProps) {
  const t = useTranslations("analytics")

  return (
    <section className="border-t border-line pt-5">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {t("navigation.routes")}
      </p>
      <nav aria-label={t("navigation.routes")} className="space-y-1">
        <Link
          href={`${basePath}?range=${range}`}
          aria-current={!activeAnalyticsId ? "page" : undefined}
          className={buttonClassName({
            className: "w-full justify-start",
            size: "sm",
            variant: !activeAnalyticsId ? "selected" : "ghost",
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

        {links.map((link) => {
          const isActive = link.analyticsId === activeAnalyticsId

          return (
            <Link
              key={link.analyticsId}
              href={`${basePath}/${encodeURIComponent(link.analyticsId)}?range=${range}`}
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
              <span className="shrink-0 text-[11px] tabular-nums text-muted">
                {formatCount(link.validClicks, locale)}
              </span>
            </Link>
          )
        })}
      </nav>
    </section>
  )
}

export function RangeFilter({ range, basePath }: { range: AnalyticsRange; basePath: string }) {
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
            href={`${basePath}?range=${option}`}
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
