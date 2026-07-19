import type {
  AnalyticsDetail,
  AnalyticsLinkSummary,
  AnalyticsOverview,
  AnalyticsRange as QueryAnalyticsRange,
} from "@/lib/analytics/types"

import type {
  AnalyticsBreakdownItem,
  AnalyticsBreakdowns,
  AnalyticsDataQuality,
  AnalyticsDetailViewModel,
  AnalyticsMetrics,
  AnalyticsOverviewViewModel,
  AnalyticsRankedLink,
  AnalyticsRange,
  AnalyticsTrendPoint,
} from "./types"

export function toQueryRange(range: AnalyticsRange): QueryAnalyticsRange {
  return `${range}d` as QueryAnalyticsRange
}

function toRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(-1, value / 100))
}

function safeRatio(numerator: number, denominator: number) {
  return denominator > 0 ? Math.min(1, Math.max(0, numerator / denominator)) : 0
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatBreakdownLabel(value: string, kind: keyof AnalyticsBreakdowns) {
  const normalized = value.trim()
  if (!normalized || ["unknown", "(not set)", "null"].includes(normalized.toLowerCase())) {
    return "Unknown"
  }

  if (kind === "countries" && /^[a-z]{2}$/i.test(normalized)) {
    return normalized.toUpperCase()
  }

  if (kind === "referrers" && ["direct", "none"].includes(normalized.toLowerCase())) {
    return "Direct"
  }

  return kind === "devices" || kind === "providers" ? titleCase(normalized) : normalized
}

function mapBreakdown(
  items: Array<{ key: string; requests: number; clicks: number }>,
  totalRequests: number,
  kind: keyof AnalyticsBreakdowns,
): AnalyticsBreakdownItem[] {
  return items.map((item) => ({
    code: kind === "countries" ? item.key.toUpperCase() : undefined,
    label: formatBreakdownLabel(item.key, kind),
    value: item.requests,
    share: safeRatio(item.requests, totalRequests),
  }))
}

function mapMetrics(totals: AnalyticsOverview["totals"]): AnalyticsMetrics {
  return {
    validClicks: totals.clicks,
    totalRequests: totals.requests,
    botRate: safeRatio(totals.bots + totals.previews, totals.requests),
    errorCount: totals.errors,
  }
}

function mapTrend(series: AnalyticsOverview["series"]): AnalyticsTrendPoint[] {
  return series.map((point) => ({
    timestamp: point.timestamp,
    validClicks: point.clicks,
    totalRequests: point.requests,
  }))
}

function mapQuality(
  data: Pick<AnalyticsOverview, "range" | "series" | "countries" | "totals">,
): AnalyticsDataQuality {
  const activePoints = data.series.filter((point) => point.requests > 0)
  const firstActivePoint = activePoints[0]
  const lastActivePoint = activePoints[activePoints.length - 1]
  const unknownCountryRequests = data.countries
    .filter((item) => ["unknown", "(not set)", "null", ""].includes(item.key.toLowerCase()))
    .reduce((sum, item) => sum + item.requests, 0)

  return {
    coverageStart: firstActivePoint?.timestamp ?? null,
    coverageEnd: lastActivePoint?.timestamp ?? null,
    lastEventAt: lastActivePoint?.timestamp ?? null,
    unknownCountryRate: safeRatio(unknownCountryRequests, data.totals.requests),
    notes: [],
  }
}

function mapBreakdowns(
  data: Pick<AnalyticsOverview, "countries" | "referrers" | "devices" | "providers" | "totals">,
): AnalyticsBreakdowns {
  return {
    countries: mapBreakdown(data.countries, data.totals.requests, "countries"),
    referrers: mapBreakdown(data.referrers, data.totals.requests, "referrers"),
    devices: mapBreakdown(data.devices, data.totals.requests, "devices"),
    providers: mapBreakdown(data.providers, data.totals.requests, "providers"),
  }
}

export function toOverviewViewModel(data: AnalyticsOverview): AnalyticsOverviewViewModel {
  return {
    metrics: mapMetrics(data.totals),
    trend: mapTrend(data.series),
    links: toRankedLinks(data.links),
    breakdowns: mapBreakdowns(data),
    quality: mapQuality(data),
    hasData: data.totals.requests > 0 || data.series.some((point) => point.requests > 0),
  }
}

export function toRankedLinks(links: AnalyticsLinkSummary[]): AnalyticsRankedLink[] {
  return links.map((link) => ({
    analyticsId: link.analyticsId,
    path: link.path,
    kind: link.linkType,
    validClicks: link.clicks,
    totalRequests: link.requests,
    changeRate: link.trendPercent === null ? null : toRatio(link.trendPercent),
  }))
}

export function toDetailViewModel(data: AnalyticsDetail): AnalyticsDetailViewModel {
  return {
    link: {
      analyticsId: data.link.analyticsId,
      path: data.link.path,
      kind: data.link.linkType,
    },
    metrics: mapMetrics(data.totals),
    trend: mapTrend(data.series),
    breakdowns: mapBreakdowns(data),
    quality: mapQuality(data),
    hasData: data.totals.requests > 0 || data.series.some((point) => point.requests > 0),
  }
}
