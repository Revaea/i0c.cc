import { analyticsRawEventRetentionDays } from "@/lib/analytics/retention-policy"
import type { AnalyticsAutomationOverview } from "@/lib/analytics/types"

import {
  mapAutomationBreakdown,
  mapBotBreakdowns,
  mapScope,
} from "./common"
import type {
  AnalyticsAutomationTrendPoint,
  AnalyticsAutomationViewModel,
  AnalyticsBreakdowns,
  AnalyticsObservedEstimate,
} from "../types"

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
  const firstActivePoint = data.series.find((point) => point.observedRequests > 0)
  const lastActivePoint = [...data.series]
    .reverse()
    .find((point) => point.observedRequests > 0)

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
      coverageStart: firstActivePoint?.timestamp ?? null,
      coverageEnd: lastActivePoint?.timestamp ?? null,
      lastEventAt: lastActivePoint?.timestamp ?? null,
      rawEventRetentionDays: analyticsRawEventRetentionDays,
      notes: [],
    },
    hasData: data.totals.observedRequests > 0 || data.totals.estimatedRequests > 0,
  }
}
