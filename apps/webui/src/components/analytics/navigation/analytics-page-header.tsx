import Link from "next/link"
import { useTranslations } from "next-intl"

import { AnalyticsRefreshButton } from "@/components/analytics/navigation/analytics-refresh-button"
import { buildAnalyticsHref } from "@/components/analytics/navigation/links"
import {
  analyticsRanges,
  type AnalyticsRange,
} from "@/components/analytics/data/types"
import { buttonClassName } from "@/components/ui/controls/button"
import { refreshAnalytics } from "@/lib/analytics/actions"

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
      className={`mb-6 flex flex-wrap items-center gap-3 border-b border-line pb-5 lg:pb-4 ${
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

function RangeFilter({
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
          </Link>
        )
      })}
    </div>
  )
}
