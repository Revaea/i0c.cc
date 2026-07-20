import type {
  AnalyticsAutomationDimensionPoint,
  AnalyticsBotBreakdowns,
  AnalyticsRange as QueryAnalyticsRange,
  AnalyticsScope,
} from "@/lib/analytics/types"

import type {
  AnalyticsBreakdownItem,
  AnalyticsBreakdowns,
  AnalyticsRange,
  AnalyticsScopeViewModel,
} from "../types"

export function toQueryRange(range: AnalyticsRange): QueryAnalyticsRange {
  return `${range}d` as QueryAnalyticsRange
}

export function safeRatio(numerator: number, denominator: number) {
  return denominator > 0 ? Math.min(1, Math.max(0, numerator / denominator)) : 0
}

export function mapAutomationBreakdown(
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

export function mapScope(scope: AnalyticsScope): AnalyticsScopeViewModel {
  return {
    entryDomain: scope.entryDomain,
    availableEntryDomains: scope.availableEntryDomains.map((option) => ({
      value: option.value,
      requestCount: option.requests,
    })),
  }
}

export function mapBotBreakdowns(
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
