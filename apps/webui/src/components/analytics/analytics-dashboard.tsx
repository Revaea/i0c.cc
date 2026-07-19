import {
  BreakdownGrid,
  DataQualityPanel,
  MetricCards,
  TrendChart,
} from "./analytics-panels"
import type {
  AnalyticsDetailViewModel,
  AnalyticsOverviewViewModel,
} from "./types"

interface AnalyticsOverviewDashboardProps {
  data: AnalyticsOverviewViewModel
  locale: string
}

interface AnalyticsDetailDashboardProps {
  data: AnalyticsDetailViewModel
  locale: string
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
      <DataQualityPanel quality={data.quality} locale={locale} />
    </div>
  )
}
