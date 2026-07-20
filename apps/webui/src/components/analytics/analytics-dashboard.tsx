import {
  AutomationLinkRanking,
  AutomationMetricCards,
  AutomationTrendChart,
  BotBreakdownGrid,
  BreakdownGrid,
  DataQualityPanel,
  MetricCards,
  TrendChart,
} from "./analytics-panels"
import type {
  AnalyticsAutomationViewModel,
  AnalyticsDetailViewModel,
  AnalyticsOverviewViewModel,
  AnalyticsRange,
} from "./types"

interface AnalyticsOverviewDashboardProps {
  data: AnalyticsOverviewViewModel
  locale: string
}

interface AnalyticsDetailDashboardProps {
  data: AnalyticsDetailViewModel
  locale: string
}

interface AnalyticsAutomationDashboardProps {
  data: AnalyticsAutomationViewModel
  detailBasePath: string
  locale: string
  range: AnalyticsRange
}

export function AnalyticsOverviewDashboard({
  data,
  locale,
}: AnalyticsOverviewDashboardProps) {
  return (
    <div className="space-y-6">
      <MetricCards metrics={data.metrics} locale={locale} />
      <TrendChart points={data.trend} locale={locale} chartId="analytics-overview-trend" />
      <BreakdownGrid breakdowns={data.breakdowns} locale={locale} />
      <BotBreakdownGrid breakdowns={data.breakdowns} locale={locale} />
      <DataQualityPanel quality={data.quality} locale={locale} />
    </div>
  )
}

export function AnalyticsDetailDashboard({ data, locale }: AnalyticsDetailDashboardProps) {
  return (
    <div className="space-y-6">
      <MetricCards metrics={data.metrics} locale={locale} />
      <TrendChart points={data.trend} locale={locale} chartId="analytics-detail-trend" />
      <BreakdownGrid breakdowns={data.breakdowns} locale={locale} />
      <BotBreakdownGrid breakdowns={data.breakdowns} locale={locale} />
      <DataQualityPanel quality={data.quality} locale={locale} />
    </div>
  )
}

export function AnalyticsAutomationDashboard({
  data,
  detailBasePath,
  locale,
  range,
}: AnalyticsAutomationDashboardProps) {
  return (
    <div className="space-y-6">
      <AutomationMetricCards metrics={data.metrics} locale={locale} />
      <AutomationTrendChart points={data.trend} locale={locale} />
      <BotBreakdownGrid breakdowns={data.breakdowns} locale={locale} includeDelivery />
      <AutomationLinkRanking
        links={data.links}
        locale={locale}
        range={range}
        detailBasePath={detailBasePath}
        entryDomain={data.scope.entryDomain}
      />
      <DataQualityPanel quality={data.quality} locale={locale} />
    </div>
  )
}
