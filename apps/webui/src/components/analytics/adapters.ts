import { analyticsRawEventRetentionDays } from "@/lib/analytics/retention-policy"
import type {
  AnalyticsAutomationDimensionPoint,
  AnalyticsAutomationOverview,
  AnalyticsBotBreakdowns,
  AnalyticsDetail,
  AnalyticsDimensionPoint,
  AnalyticsLinkSummary,
  AnalyticsOverview,
  AnalyticsRange as QueryAnalyticsRange,
  AnalyticsScope,
} from "@/lib/analytics/types"

import type {
  AnalyticsAutomationTrendPoint,
  AnalyticsAutomationViewModel,
  AnalyticsBreakdownItem,
  AnalyticsBreakdowns,
  AnalyticsDataQuality,
  AnalyticsDetailViewModel,
  AnalyticsMetrics,
  AnalyticsObservedEstimate,
  AnalyticsOverviewViewModel,
  AnalyticsRankedLink,
  AnalyticsRange,
  AnalyticsScopeViewModel,
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

function mapAutomationBreakdown(
  items: AnalyticsAutomationDimensionPoint[],
  totalObservedRequests: number,
  kind: keyof AnalyticsBreakdowns,
): AnalyticsBreakdownItem[] {
  return items.map((item) => ({
    code: kind === "countries" ? item.key.toUpperCase() : undefined,
    key: item.key,
    label: item.label ?? undefined,
    value: item.observedRequests,
    estimatedValue: item.estimatedRequests,
    share: safeRatio(item.observedRequests, totalObservedRequests),
  }))
}

function mapScope(scope: AnalyticsScope): AnalyticsScopeViewModel {
  return {
    entryDomain: scope.entryDomain,
    availableEntryDomains: scope.availableEntryDomains.map((option) => ({
      value: option.value,
      requestCount: option.requests,
    })),
  }
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

function mapBotBreakdowns(
  botBreakdowns: AnalyticsBotBreakdowns,
  totalRequests: number,
): Pick<
  AnalyticsBreakdowns,
  | "trafficClasses"
  | "botCategories"
  | "botConfidences"
  | "classifierVersions"
  | "resourceClasses"
  | "matchKinds"
  | "outcomes"
  | "probes"
> {
  return {
    trafficClasses: mapAutomationBreakdown(
      botBreakdowns.trafficClasses,
      totalRequests,
      "trafficClasses",
    ),
    botCategories: mapAutomationBreakdown(
      botBreakdowns.categories,
      totalRequests,
      "botCategories",
    ),
    botConfidences: mapAutomationBreakdown(
      botBreakdowns.confidences,
      totalRequests,
      "botConfidences",
    ),
    classifierVersions: mapAutomationBreakdown(
      botBreakdowns.classifierVersions,
      totalRequests,
      "classifierVersions",
    ),
    resourceClasses: mapAutomationBreakdown(
      botBreakdowns.resourceClasses,
      totalRequests,
      "resourceClasses",
    ),
    matchKinds: mapAutomationBreakdown(
      botBreakdowns.matchKinds,
      totalRequests,
      "matchKinds",
    ),
    outcomes: mapAutomationBreakdown(botBreakdowns.outcomes, totalRequests, "outcomes"),
    probes: mapAutomationBreakdown(botBreakdowns.probes, totalRequests, "probes"),
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

export function toRankedLinks(links: AnalyticsLinkSummary[]): AnalyticsRankedLink[] {
  return links.map((link) => ({
    analyticsId: link.analyticsId,
    path: link.path,
    kind: link.linkType,
    estimatedNavigations: link.clicks,
    estimatedEntryNavigations: link.entryClicks,
    totalRequests: link.requests,
    entryRequests: link.entryRequests,
    changeRate: link.trendPercent === null ? null : toRatio(link.trendPercent),
  }))
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

function observedEstimate(observed: number, estimated: number): AnalyticsObservedEstimate {
  return { observed, estimated }
}

function emptyGeneralBreakdowns(): Pick<
  AnalyticsBreakdowns,
  "entryDomains" | "countries" | "referrers" | "devices" | "campaigns" | "upstreamLinks"
> {
  return {
    entryDomains: [],
    countries: [],
    referrers: [],
    devices: [],
    campaigns: [],
    upstreamLinks: [],
  }
}

function mapAutomationTrend(data: AnalyticsAutomationOverview): AnalyticsAutomationTrendPoint[] {
  return data.series.map((point) => ({
    timestamp: point.timestamp,
    declaredBots: observedEstimate(
      point.observedDeclaredBots,
      point.estimatedDeclaredBots,
    ),
    suspectedAutomation: observedEstimate(
      point.observedSuspectedAutomation,
      point.estimatedSuspectedAutomation,
    ),
    unmatched: observedEstimate(point.observedUnmatched, point.estimatedUnmatched),
  }))
}

export function toAutomationViewModel(
  data: AnalyticsAutomationOverview,
): AnalyticsAutomationViewModel {
  const totalObserved = data.totals.observedRequests
  const providerBreakdown = mapAutomationBreakdown(data.providers, totalObserved, "providers")

  return {
    scope: mapScope(data.scope),
    metrics: {
      requests: observedEstimate(data.totals.observedRequests, data.totals.estimatedRequests),
      declaredBots: observedEstimate(
        data.totals.observedDeclaredBots,
        data.totals.estimatedDeclaredBots,
      ),
      suspectedAutomation: observedEstimate(
        data.totals.observedSuspectedAutomation,
        data.totals.estimatedSuspectedAutomation,
      ),
      unmatched: observedEstimate(
        data.totals.observedUnmatched,
        data.totals.estimatedUnmatched,
      ),
      errors: observedEstimate(data.totals.observedErrors, data.totals.estimatedErrors),
    },
    trend: mapAutomationTrend(data),
    links: data.links.map((link) => ({
      analyticsId: link.analyticsId,
      path: link.path,
      kind: link.linkType,
      observedRequests: link.observedRequests,
      estimatedRequests: link.estimatedRequests,
    })),
    breakdowns: {
      ...emptyGeneralBreakdowns(),
      providers: providerBreakdown,
      entryDomains: mapAutomationBreakdown(
        data.entryDomains,
        totalObserved,
        "entryDomains",
      ),
      ...mapBotBreakdowns(data.botBreakdowns, totalObserved),
    },
    quality: {
      coverageStart: data.series.find((point) => point.observedRequests > 0)?.timestamp ?? null,
      coverageEnd: [...data.series].reverse().find((point) => point.observedRequests > 0)?.timestamp ?? null,
      lastEventAt: [...data.series].reverse().find((point) => point.observedRequests > 0)?.timestamp ?? null,
      rawEventRetentionDays: analyticsRawEventRetentionDays,
      notes: [],
    },
    hasData: data.totals.observedRequests > 0 || data.totals.estimatedRequests > 0,
  }
}
