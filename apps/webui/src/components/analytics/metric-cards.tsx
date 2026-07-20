import { useTranslations } from "next-intl"

import { formatCount } from "./format"
import type {
  AnalyticsAutomationMetrics,
  AnalyticsMetrics,
} from "./types"

interface MetricCardsProps {
  metrics: AnalyticsMetrics
  locale: string
}

interface AutomationMetricCardsProps {
  metrics: AnalyticsAutomationMetrics
  locale: string
}

export function MetricCards({ metrics, locale }: MetricCardsProps) {
  const t = useTranslations("analytics")
  const metricItems = [
    {
      label: t("metrics.effectiveVisits"),
      value: formatCount(metrics.estimatedEntryNavigations, locale),
      description: t("metrics.effectiveVisitsDescription"),
    },
    {
      label: t("metrics.totalRequests"),
      value: formatCount(metrics.totalRequests, locale),
      description: t("metrics.totalRequestsDescription"),
    },
    {
      label: t("metrics.errors"),
      value: formatCount(metrics.errorCount, locale),
      description: t("metrics.errorsDescription"),
    },
  ]

  return (
    <section aria-labelledby="analytics-kpis-title">
      <h2 id="analytics-kpis-title" className="sr-only">
        {t("metrics.title")}
      </h2>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {metricItems.map((metric) => (
          <article key={metric.label} className="bg-panel px-5 py-5 sm:px-6">
            <p className="text-sm font-medium text-muted">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink tabular-nums sm:text-4xl">
              {metric.value}
            </p>
            <p className="mt-2 max-w-xs text-xs leading-5 text-muted">{metric.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function AutomationMetricCards({ metrics, locale }: AutomationMetricCardsProps) {
  const t = useTranslations("analytics")
  const metricItems = [
    { label: t("automation.metrics.requests"), values: metrics.requests },
    { label: t("automation.metrics.declaredBots"), values: metrics.declaredBots },
    {
      label: t("automation.metrics.suspectedAutomation"),
      values: metrics.suspectedAutomation,
    },
    { label: t("automation.metrics.unmatched"), values: metrics.unmatched },
    { label: t("automation.metrics.errors"), values: metrics.errors },
  ]

  return (
    <section aria-labelledby="analytics-automation-kpis-title">
      <h2 id="analytics-automation-kpis-title" className="sr-only">
        {t("automation.metrics.title")}
      </h2>
      <p className="mb-3 text-xs leading-5 text-muted">
        {t("automation.metrics.description")}
      </p>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-5">
        {metricItems.map((metric) => (
          <article key={metric.label} className="bg-panel px-5 py-5">
            <p className="text-sm font-medium text-muted">{metric.label}</p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t("automation.observed")}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">
              {formatCount(metric.values.observed, locale)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              {t("automation.estimatedValue", {
                count: formatCount(metric.values.estimated, locale),
              })}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
