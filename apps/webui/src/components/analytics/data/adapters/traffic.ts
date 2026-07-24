import { analyticsRawEventRetentionDays } from "@/lib/analytics/retention-policy"
import type {
  AnalyticsDetail,
  AnalyticsDimensionPoint,
  AnalyticsLinkSummary,
  AnalyticsOverview,
  AnalyticsTrendComparison,
} from "@/lib/analytics/types"

import {
  mapBotBreakdowns,
  mapScope,
  safeRatio,
} from "./common"
import type {
  AnalyticsBreakdownItem,
  AnalyticsBreakdowns,
  AnalyticsDataQuality,
  AnalyticsDetailViewModel,
  AnalyticsMetrics,
  AnalyticsOverviewViewModel,
  AnalyticsRankedLink,
  AnalyticsTrendPoint,
} from "../types"

function mapBreakdown(
  items: AnalyticsDimensionPoint[],
  totalRequests: number,
  kind: keyof AnalyticsBreakdowns,
): AnalyticsBreakdownItem[] {
  return items.map((item) => ({
    code: kind === "countries" ? item.key.toUpperCase() : undefined,
    key: item.key,
    label: item.label ?? undefined,
    value: item.requests,
    share: safeRatio(item.requests, totalRequests),
  }))
}

function mapMetrics(totals: AnalyticsOverview["totals"]): AnalyticsMetrics {
  return {
    estimatedNavigations: totals.clicks,
    estimatedEntryNavigations: totals.entryClicks,
    totalRequests: totals.requests,
    entryRequests: totals.entryRequests,
    declaredBotRate: safeRatio(totals.declaredBots, totals.requests),
    suspectedAutomationRate: safeRatio(totals.suspectedAutomation, totals.requests),
    errorCount: totals.errors,
  }
}

function mapTrend(series: AnalyticsOverview["series"]): AnalyticsTrendPoint[] {
  return series.map((point) => ({
    timestamp: point.timestamp,
    estimatedNavigations: point.clicks,
    estimatedEntryNavigations: point.entryClicks,
    totalRequests: point.requests,
    entryRequests: point.entryRequests,
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
    rawEventRetentionDays: analyticsRawEventRetentionDays,
    unknownCountryRate: safeRatio(unknownCountryRequests, data.totals.requests),
    notes: [],
  }
}

function mapBreakdowns(data: AnalyticsOverview | AnalyticsDetail): AnalyticsBreakdowns {
  return {
    entryDomains: [],
    countries: mapBreakdown(data.countries, data.totals.requests, "countries"),
    referrers: mapBreakdown(data.referrers, data.totals.requests, "referrers"),
    devices: mapBreakdown(data.devices, data.totals.requests, "devices"),
    providers: mapBreakdown(data.providers, data.totals.requests, "providers"),
    campaigns: mapBreakdown(data.campaigns, data.totals.requests, "campaigns"),
    upstreamLinks: mapBreakdown(data.upstreamLinks, data.totals.requests, "upstreamLinks"),
    ...mapBotBreakdowns(data.botBreakdowns, data.totals.requests),
  }
}

export function toOverviewViewModel(data: AnalyticsOverview): AnalyticsOverviewViewModel {
  return {
    scope: mapScope(data.scope),
    metrics: mapMetrics(data.totals),
    trend: mapTrend(data.series),
    links: toRankedLinks(data.links),
    breakdowns: mapBreakdowns(data),
    quality: mapQuality(data),
    hasData: data.totals.requests > 0 || data.series.some((point) => point.requests > 0),
  }
}

function toRankedLinks(links: AnalyticsLinkSummary[]): AnalyticsRankedLink[] {
  return links.map((link) => ({
    analyticsId: link.analyticsId,
    path: link.path,
    kind: link.linkType,
    estimatedNavigations: link.clicks,
    estimatedEntryNavigations: link.entryClicks,
    totalRequests: link.requests,
    entryRequests: link.entryRequests,
    trend: resolveLinkTrend(link),
  }))
}

export function resolveLinkTrend(
  link: Pick<AnalyticsLinkSummary, "trend" | "trendPercent">,
): AnalyticsTrendComparison {
  if (link.trend) {
    return link.trend
  }

  if (typeof link.trendPercent === "number") {
    return link.trendPercent === 0
      ? { status: "unchanged" }
      : { status: "percentage", percent: link.trendPercent }
  }

  return { status: "unavailable" }
}

export function toDetailViewModel(data: AnalyticsDetail): AnalyticsDetailViewModel {
  return {
    scope: mapScope(data.scope),
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
