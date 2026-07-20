import Link from "next/link"
import { useTranslations } from "next-intl"

import { cardClassName } from "@/components/ui/card"

import {
  formatChangeRate,
  formatCount,
  formatDate,
  formatDay,
  formatPercent,
} from "./format"
import { buildAnalyticsHref } from "./links"
import type {
  AnalyticsAutomationLink,
  AnalyticsAutomationMetrics,
  AnalyticsAutomationTrendPoint,
  AnalyticsBreakdownItem,
  AnalyticsBreakdowns,
  AnalyticsDataQuality,
  AnalyticsMetrics,
  AnalyticsRange,
  AnalyticsRankedLink,
  AnalyticsTrendPoint,
} from "./types"

interface MetricCardsProps {
  metrics: AnalyticsMetrics
  locale: string
}

interface TrendChartProps {
  points: AnalyticsTrendPoint[]
  locale: string
  chartId: string
  accessibleTitle?: string
  description?: string
  primaryLabel?: string
  secondaryLabel?: string
  title?: string
}

interface LinkRankingProps {
  links: AnalyticsRankedLink[]
  locale: string
  range: AnalyticsRange
  detailBasePath: string
  entryDomain: string
}

interface AutomationMetricCardsProps {
  metrics: AnalyticsAutomationMetrics
  locale: string
}

interface AutomationTrendChartProps {
  points: AnalyticsAutomationTrendPoint[]
  locale: string
}

interface AutomationLinkRankingProps {
  links: AnalyticsAutomationLink[]
  locale: string
  range: AnalyticsRange
  detailBasePath: string
  entryDomain: string
}

interface BreakdownGridProps {
  breakdowns: AnalyticsBreakdowns
  locale: string
}

interface DataQualityPanelProps {
  quality: AnalyticsDataQuality
  locale: string
}

const chart = {
  width: 760,
  height: 260,
  left: 52,
  right: 20,
  top: 18,
  bottom: 42,
}

const plotWidth = chart.width - chart.left - chart.right
const plotHeight = chart.height - chart.top - chart.bottom

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
              {t("automation.estimated")}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">
              {formatCount(metric.values.estimated, locale)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              {t("automation.metrics.observedValue", {
                count: formatCount(metric.values.observed, locale),
              })}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function AutomationTrendChart({ points, locale }: AutomationTrendChartProps) {
  const t = useTranslations("analytics")
  const chartPoints: AnalyticsTrendPoint[] = points.map((point) => ({
    timestamp: point.timestamp,
    estimatedNavigations: point.declaredBots.estimated,
    estimatedEntryNavigations: point.declaredBots.estimated,
    totalRequests: point.suspectedAutomation.estimated,
    entryRequests: point.suspectedAutomation.observed,
  }))

  return (
    <TrendChart
      points={chartPoints}
      locale={locale}
      chartId="analytics-automation-trend"
      accessibleTitle={t("automation.trend.accessibleTitle")}
      title={t("automation.trend.title")}
      description={t("automation.trend.description")}
      primaryLabel={t("automation.metrics.declaredBots")}
      secondaryLabel={t("automation.metrics.suspectedAutomation")}
    />
  )
}

function getCoordinates(
  points: AnalyticsTrendPoint[],
  maxValue: number,
  selectValue: (point: AnalyticsTrendPoint) => number,
) {
  return points.map((point, index) => {
    const x =
      chart.left +
      (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth)
    const y = chart.top + (1 - Math.max(0, selectValue(point)) / maxValue) * plotHeight

    return { x, y }
  })
}

function getLinePath(coordinates: Array<{ x: number; y: number }>) {
  return coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")
}

function getAreaPath(coordinates: Array<{ x: number; y: number }>) {
  if (coordinates.length === 0) {
    return ""
  }

  const line = getLinePath(coordinates)
  const last = coordinates[coordinates.length - 1]
  const first = coordinates[0]
  const baseline = chart.top + plotHeight

  return `${line} L ${last.x.toFixed(2)} ${baseline} L ${first.x.toFixed(2)} ${baseline} Z`
}

export function TrendChart({
  points,
  locale,
  chartId,
  accessibleTitle,
  description,
  primaryLabel,
  secondaryLabel,
  title,
}: TrendChartProps) {
  const t = useTranslations("analytics")
  const resolvedPrimaryLabel = primaryLabel ?? t("metrics.effectiveVisits")
  const resolvedSecondaryLabel = secondaryLabel ?? t("metrics.totalRequests")
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [point.estimatedEntryNavigations, point.totalRequests]),
  )
  const clickCoordinates = getCoordinates(
    points,
    maxValue,
    (point) => point.estimatedEntryNavigations,
  )
  const requestCoordinates = getCoordinates(points, maxValue, (point) => point.totalRequests)
  const labelIndices = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]))
    .filter((index) => index >= 0)

  return (
    <section className={cardClassName({ elevation: "flat", padding: "md", className: "sm:p-6" })}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title ?? t("trend.title")}</h2>
          <p className="mt-1 text-sm text-muted">
            {description ?? t("trend.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-muted" aria-hidden="true">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-accent" />
            {resolvedPrimaryLabel}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 rounded-full bg-line-strong" />
            {resolvedSecondaryLabel}
          </span>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="mt-6 flex min-h-64 items-center justify-center rounded-xl border border-dashed border-line bg-panel-muted px-6 text-center text-sm text-muted">
          {t("trend.empty")}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            role="img"
            aria-labelledby={`${chartId}-title ${chartId}-description`}
            className="h-auto min-w-[42rem] w-full"
          >
            <title id={`${chartId}-title`}>
              {accessibleTitle ?? t("trend.accessibleTitle")}
            </title>
            <desc id={`${chartId}-description`}>
              {t("trend.accessibleDescription", {
                start: formatDay(points[0].timestamp, locale),
                end: formatDay(points[points.length - 1].timestamp, locale),
              })}
            </desc>
            <defs>
              <linearGradient id={`${chartId}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 0.5, 1].map((step) => {
              const y = chart.top + step * plotHeight
              const value = maxValue * (1 - step)

              return (
                <g key={step}>
                  <line
                    x1={chart.left}
                    x2={chart.left + plotWidth}
                    y1={y}
                    y2={y}
                    stroke="var(--line)"
                    strokeDasharray={step === 1 ? undefined : "4 5"}
                  />
                  <text
                    x={chart.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-muted text-[11px]"
                  >
                    {formatCount(Math.round(value), locale)}
                  </text>
                </g>
              )
            })}

            <path d={getAreaPath(clickCoordinates)} fill={`url(#${chartId}-fill)`} />
            <path
              d={getLinePath(requestCoordinates)}
              fill="none"
              stroke="var(--line-strong)"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={getLinePath(clickCoordinates)}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {labelIndices.map((index) => {
              const coordinate = clickCoordinates[index]
              const point = points[index]

              return (
                <text
                  key={`${point.timestamp}-${index}`}
                  x={coordinate.x}
                  y={chart.height - 12}
                  textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                  className="fill-muted text-[11px]"
                >
                  {point.label ?? formatDay(point.timestamp, locale)}
                </text>
              )
            })}
          </svg>

          <table className="sr-only">
            <caption>{t("trend.tableCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("trend.date")}</th>
                <th scope="col">{resolvedPrimaryLabel}</th>
                <th scope="col">{resolvedSecondaryLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.timestamp}>
                  <th scope="row">{point.label ?? formatDay(point.timestamp, locale)}</th>
                  <td>{point.estimatedEntryNavigations}</td>
                  <td>{point.totalRequests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function TrendChange({ value, locale }: { value?: number | null; locale: string }) {
  const t = useTranslations("analytics")
  const isPositive = typeof value === "number" && value > 0
  const isNegative = typeof value === "number" && value < 0

  return (
    <span
      className={`text-xs font-medium tabular-nums ${
        isPositive ? "text-emerald-700" : isNegative ? "text-rose-700" : "text-muted"
      }`}
    >
      {typeof value === "number" && Number.isFinite(value)
        ? t("ranking.changeCompared", { value: formatChangeRate(value, locale) })
        : t("ranking.noComparison")}
    </span>
  )
}

function LinkKindBadge({ kind }: { kind?: string }) {
  const t = useTranslations("analytics")
  const labels: Record<string, string> = {
    redirect: t("labels.linkTypes.redirect"),
    proxy: t("labels.linkTypes.proxy"),
  }

  return (
    <span className="inline-flex rounded-full border border-line bg-panel-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
      {kind ? labels[kind] ?? kind : t("detail.linkKind")}
    </span>
  )
}

export function LinkRanking({
  links,
  locale,
  range,
  detailBasePath,
  entryDomain,
}: LinkRankingProps) {
  const t = useTranslations("analytics")

  return (
    <section className={cardClassName({ elevation: "flat", padding: "none" })}>
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <h2 className="text-lg font-semibold text-ink">{t("ranking.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("ranking.description")}</p>
      </div>

      {links.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted">
          {t("ranking.empty")}
        </div>
      ) : (
        <>
          <div className="divide-y divide-line md:hidden">
            {links.map((link, index) => (
              <article key={link.analyticsId} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted">#{index + 1}</span>
                      <LinkKindBadge kind={link.kind} />
                    </div>
                    <Link
                      href={buildAnalyticsHref(
                        `${detailBasePath}/${encodeURIComponent(link.analyticsId)}`,
                        { entryDomain, range },
                      )}
                      className="mt-2 block truncate font-mono text-sm font-semibold text-ink hover:text-accent hover:underline"
                    >
                      {link.path}
                    </Link>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold tabular-nums text-ink">
                      {formatCount(link.estimatedEntryNavigations, locale)}
                    </p>
                    <p className="text-xs text-muted">{t("metrics.effectiveVisits")}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="text-xs text-muted">
                    {t("ranking.requestCount", {
                      count: formatCount(link.totalRequests, locale),
                    })}
                  </span>
                  <TrendChange value={link.changeRate} locale={locale} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[48rem] text-left">
              <caption className="sr-only">{t("ranking.tableCaption")}</caption>
              <thead className="bg-panel-muted text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="w-16 px-6 py-3">{t("ranking.rank")}</th>
                  <th scope="col" className="px-3 py-3">{t("ranking.shortLink")}</th>
                  <th scope="col" className="px-3 py-3">{t("ranking.type")}</th>
                  <th scope="col" className="px-3 py-3 text-right">{t("metrics.effectiveVisits")}</th>
                  <th scope="col" className="px-3 py-3 text-right">{t("metrics.totalRequests")}</th>
                  <th scope="col" className="px-6 py-3 text-right">{t("ranking.change")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {links.map((link, index) => (
                  <tr key={link.analyticsId} className="transition hover:bg-panel-muted/70">
                    <td className="px-6 py-4 text-sm font-medium text-muted">{index + 1}</td>
                    <th scope="row" className="px-3 py-4 font-normal">
                      <Link
                        href={buildAnalyticsHref(
                          `${detailBasePath}/${encodeURIComponent(link.analyticsId)}`,
                          { entryDomain, range },
                        )}
                        className="block truncate font-mono text-sm font-semibold text-ink hover:text-accent hover:underline"
                      >
                        {link.path}
                      </Link>
                    </th>
                    <td className="px-3 py-4"><LinkKindBadge kind={link.kind} /></td>
                    <td className="px-3 py-4 text-right text-sm font-semibold tabular-nums text-ink">
                      {formatCount(link.estimatedEntryNavigations, locale)}
                    </td>
                    <td className="px-3 py-4 text-right text-sm tabular-nums text-muted">
                      {formatCount(link.totalRequests, locale)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <TrendChange value={link.changeRate} locale={locale} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export function AutomationLinkRanking({
  links,
  locale,
  range,
  detailBasePath,
  entryDomain,
}: AutomationLinkRankingProps) {
  const t = useTranslations("analytics")

  return (
    <section className={cardClassName({ elevation: "flat", padding: "none" })}>
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <h2 className="text-lg font-semibold text-ink">{t("automation.ranking.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("automation.ranking.description")}</p>
      </div>
      {links.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted">
          {t("automation.ranking.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <caption className="sr-only">{t("automation.ranking.tableCaption")}</caption>
            <thead className="bg-panel-muted text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-6 py-3">{t("ranking.shortLink")}</th>
                <th scope="col" className="px-3 py-3 text-right">
                  {t("automation.estimated")}
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  {t("automation.observed")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {links.map((link) => (
                <tr key={link.analyticsId}>
                  <th scope="row" className="px-6 py-4 font-normal">
                    <Link
                      href={buildAnalyticsHref(
                        `${detailBasePath}/${encodeURIComponent(link.analyticsId)}`,
                        { entryDomain, range },
                      )}
                      className="font-mono text-sm font-semibold text-ink hover:text-accent hover:underline"
                    >
                      {link.path}
                    </Link>
                  </th>
                  <td className="px-3 py-4 text-right text-sm font-semibold tabular-nums text-ink">
                    {formatCount(link.estimatedRequests, locale)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm tabular-nums text-muted">
                    {formatCount(link.observedRequests, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

type AnalyticsBreakdownKind = keyof AnalyticsBreakdowns
type BreakdownCardConfig = [
  title: string,
  kind: AnalyticsBreakdownKind,
  items: AnalyticsBreakdownItem[],
]

function useAnalyticsLabelFormatter(locale: string) {
  const t = useTranslations("analytics")
  const regionNames = new Intl.DisplayNames([locale], { type: "region" })
  const dimensionLabels: Partial<
    Record<AnalyticsBreakdownKind, Record<string, string>>
  > = {
    devices: {
      desktop: t("labels.devices.desktop"),
      mobile: t("labels.devices.mobile"),
      tablet: t("labels.devices.tablet"),
      bot: t("labels.devices.bot"),
    },
    providers: {
      cloudflare: t("labels.providers.cloudflare"),
      vercel: t("labels.providers.vercel"),
      netlify: t("labels.providers.netlify"),
    },
    trafficClasses: {
      browser_like: t("labels.trafficClasses.browserLike"),
      declared_bot: t("labels.trafficClasses.declaredBot"),
      suspected_automation: t("labels.trafficClasses.suspectedAutomation"),
    },
    botCategories: {
      none: t("labels.botCategories.none"),
      search: t("labels.botCategories.search"),
      ai_crawler: t("labels.botCategories.aiCrawler"),
      social_preview: t("labels.botCategories.socialPreview"),
      monitor: t("labels.botCategories.monitor"),
      automation: t("labels.botCategories.automation"),
      security_probe: t("labels.botCategories.securityProbe"),
    },
    botConfidences: {
      none: t("labels.botConfidences.none"),
      low: t("labels.botConfidences.low"),
      medium: t("labels.botConfidences.medium"),
      high: t("labels.botConfidences.high"),
    },
    resourceClasses: {
      document: t("labels.resourceClasses.document"),
      asset: t("labels.resourceClasses.asset"),
      api: t("labels.resourceClasses.api"),
      other: t("labels.resourceClasses.other"),
    },
    matchKinds: {
      exact: t("labels.matchKinds.exact"),
      parameterized: t("labels.matchKinds.parameterized"),
      prefix: t("labels.matchKinds.prefix"),
      catch_all: t("labels.matchKinds.catchAll"),
      unmatched: t("labels.matchKinds.unmatched"),
      system: t("labels.matchKinds.system"),
    },
    outcomes: {
      matched: t("labels.outcomes.matched"),
      not_found: t("labels.outcomes.notFound"),
      proxy_exhausted: t("labels.outcomes.proxyExhausted"),
      config_unavailable: t("labels.outcomes.configUnavailable"),
      internal_error: t("labels.outcomes.internalError"),
    },
    probes: {
      none: t("labels.probes.none"),
      wordpress: t("labels.probes.wordpress"),
      env_file: t("labels.probes.envFile"),
      admin: t("labels.probes.admin"),
      vcs: t("labels.probes.vcs"),
      path_traversal: t("labels.probes.pathTraversal"),
      scanner: t("labels.probes.scanner"),
      other: t("labels.probes.other"),
    },
  }

  return (item: AnalyticsBreakdownItem, kind: AnalyticsBreakdownKind) => {
    const normalizedKey = item.key.trim()
    const lookupKey = normalizedKey.toLowerCase()

    if (!normalizedKey || ["unknown", "(not set)", "null"].includes(lookupKey)) {
      return t("breakdowns.unknown")
    }

    if (kind === "countries" && /^[a-z]{2}$/i.test(normalizedKey)) {
      const countryCode = normalizedKey.toUpperCase()
      return regionNames.of(countryCode) ?? countryCode
    }

    if (kind === "referrers" && ["direct", "none"].includes(lookupKey)) {
      return t("breakdowns.direct")
    }

    if (kind === "classifierVersions") {
      return t("labels.classifierVersion", { version: normalizedKey })
    }

    const fallbackLabel = item.label?.trim() || normalizedKey
    return dimensionLabels[kind]?.[lookupKey] ?? fallbackLabel
  }
}

function BreakdownCard({
  title,
  items,
  locale,
  kind,
}: {
  title: string
  items: AnalyticsBreakdownItem[]
  locale: string
  kind: AnalyticsBreakdownKind
}) {
  const t = useTranslations("analytics")
  const formatLabel = useAnalyticsLabelFormatter(locale)

  return (
    <article className={cardClassName({ elevation: "flat", padding: "md" })}>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-muted">{t("breakdowns.empty")}</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {items.slice(0, 5).map((item) => {
            const displayLabel = formatLabel(item, kind)

            return (
              <li key={`${item.code ?? item.key}-${item.key}`}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-medium text-ink">{displayLabel}</span>
                  <span className="shrink-0 text-right tabular-nums text-muted">
                    <span className="block">
                      {t("breakdowns.itemValue", {
                        count: formatCount(item.value, locale),
                        share: formatPercent(item.share, locale),
                      })}
                    </span>
                    {item.observedValue === undefined ? null : (
                      <span className="mt-0.5 block text-[10px]">
                        {t("automation.breakdowns.observedValue", {
                          count: formatCount(item.observedValue, locale),
                        })}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${item.share > 0 ? Math.max(2, Math.min(100, item.share * 100)) : 0}%`,
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </article>
  )
}

function BreakdownSection({
  cards,
  description,
  id,
  locale,
  title,
  columns = "three",
}: {
  cards: BreakdownCardConfig[]
  description: string
  id: string
  locale: string
  title: string
  columns?: "three" | "four"
}) {
  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="mb-4">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div
        className={`grid gap-4 sm:grid-cols-2 ${
          columns === "four" ? "xl:grid-cols-4" : "xl:grid-cols-3"
        }`}
      >
        {cards.map(([cardTitle, kind, items]) => (
          <BreakdownCard
            key={kind}
            title={cardTitle}
            items={items}
            locale={locale}
            kind={kind}
          />
        ))}
      </div>
    </section>
  )
}

export function BreakdownGrid({ breakdowns, locale }: BreakdownGridProps) {
  const t = useTranslations("analytics")
  const sourceCards: BreakdownCardConfig[] = [
    [t("breakdowns.referrers"), "referrers", breakdowns.referrers],
    [t("breakdowns.countries"), "countries", breakdowns.countries],
    [t("breakdowns.devices"), "devices", breakdowns.devices],
  ]
  const attributionCards: BreakdownCardConfig[] = [
    [t("breakdowns.providers"), "providers", breakdowns.providers],
    [t("breakdowns.campaigns"), "campaigns", breakdowns.campaigns],
    [t("breakdowns.upstreamLinks"), "upstreamLinks", breakdowns.upstreamLinks],
  ]
  const visibleAttributionCards = attributionCards.filter(([, , items]) => items.length > 0)

  return (
    <div className="space-y-6">
      <BreakdownSection
        cards={sourceCards}
        description={t("breakdowns.sourcesDescription")}
        id="analytics-sources"
        locale={locale}
        title={t("breakdowns.sourcesTitle")}
      />

      {visibleAttributionCards.length > 0 ? (
        <BreakdownSection
          cards={visibleAttributionCards}
          description={t("breakdowns.attributionDescription")}
          id="analytics-attribution"
          locale={locale}
          title={t("breakdowns.attributionTitle")}
        />
      ) : null}
    </div>
  )
}

export function BotBreakdownGrid({ breakdowns, locale }: BreakdownGridProps) {
  const t = useTranslations("analytics")
  const detectionCards: BreakdownCardConfig[] = [
    [t("automation.breakdowns.trafficClasses"), "trafficClasses", breakdowns.trafficClasses],
    [t("automation.breakdowns.categories"), "botCategories", breakdowns.botCategories],
    [t("automation.breakdowns.confidences"), "botConfidences", breakdowns.botConfidences],
    [t("automation.breakdowns.probes"), "probes", breakdowns.probes],
  ]
  const handlingCards: BreakdownCardConfig[] = [
    [t("automation.breakdowns.matchKinds"), "matchKinds", breakdowns.matchKinds],
    [t("automation.breakdowns.outcomes"), "outcomes", breakdowns.outcomes],
    [t("automation.breakdowns.resourceClasses"), "resourceClasses", breakdowns.resourceClasses],
    [t("automation.breakdowns.classifierVersions"), "classifierVersions", breakdowns.classifierVersions],
  ]

  return (
    <div className="space-y-6">
      <BreakdownSection
        cards={detectionCards}
        columns="four"
        description={t("automation.breakdowns.detectionDescription")}
        id="analytics-bot-detection"
        locale={locale}
        title={t("automation.breakdowns.detectionTitle")}
      />
      <BreakdownSection
        cards={handlingCards}
        columns="four"
        description={t("automation.breakdowns.handlingDescription")}
        id="analytics-bot-handling"
        locale={locale}
        title={t("automation.breakdowns.handlingTitle")}
      />
    </div>
  )
}

export function DataQualityPanel({ quality, locale }: DataQualityPanelProps) {
  const t = useTranslations("analytics")
  const coverage =
    quality.coverageStart && quality.coverageEnd
      ? `${formatDate(quality.coverageStart, locale)} – ${formatDate(quality.coverageEnd, locale)}`
      : t("quality.notAvailable")

  const items = [
    { label: t("quality.observedWindow"), value: coverage },
    { label: t("quality.latestEvent"), value: formatDate(quality.lastEventAt, locale) },
    {
      label: t("quality.unknownGeography"),
      value:
        quality.unknownCountryRate === null || quality.unknownCountryRate === undefined
          ? t("quality.notReported")
          : formatPercent(quality.unknownCountryRate, locale),
    },
    {
      label: t("quality.rawEventRetention"),
      value:
        quality.rawEventRetentionDays === null || quality.rawEventRetentionDays === undefined
          ? t("quality.databasePolicy")
          : t("quality.days", { count: quality.rawEventRetentionDays }),
    },
  ]

  return (
    <details className="group rounded-2xl border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-semibold text-ink">{t("quality.title")}</span>
          <span className="mt-0.5 block text-xs leading-5 text-muted">
            {t("quality.description")}
          </span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="border-t border-line px-5 pb-5 pt-4">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-medium text-muted">{item.label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold leading-5 text-ink">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-xs leading-5 text-muted">
          {[
            t("quality.humanClickNote"),
            t("quality.cacheNote"),
            t("quality.refreshNote"),
            ...(quality.notes ?? []),
          ].map((note) => (
            <li key={note} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
