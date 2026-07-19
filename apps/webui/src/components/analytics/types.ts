export const analyticsRanges = [7, 30, 90] as const

export type AnalyticsRange = (typeof analyticsRanges)[number]

export interface AnalyticsMetrics {
  validClicks: number
  totalRequests: number
  botRate: number
  errorCount: number
}

export interface AnalyticsTrendPoint {
  timestamp: string
  label?: string
  validClicks: number
  totalRequests: number
}

export interface AnalyticsRankedLink {
  analyticsId: string
  path: string
  kind?: string
  validClicks: number
  totalRequests: number
  changeRate?: number | null
}

export interface AnalyticsBreakdownItem {
  label: string
  value: number
  share: number
  code?: string
}

export interface AnalyticsBreakdowns {
  countries: AnalyticsBreakdownItem[]
  referrers: AnalyticsBreakdownItem[]
  devices: AnalyticsBreakdownItem[]
  providers: AnalyticsBreakdownItem[]
}

export interface AnalyticsDataQuality {
  coverageStart?: string | null
  coverageEnd?: string | null
  lastEventAt?: string | null
  rawEventRetentionDays?: number | null
  unknownCountryRate?: number | null
  notes?: string[]
}

export interface AnalyticsOverviewViewModel {
  metrics: AnalyticsMetrics
  trend: AnalyticsTrendPoint[]
  links: AnalyticsRankedLink[]
  breakdowns: AnalyticsBreakdowns
  quality: AnalyticsDataQuality
  hasData: boolean
}

export interface AnalyticsLinkIdentity {
  analyticsId: string
  path: string
  kind?: string
}

export interface AnalyticsDetailViewModel {
  link: AnalyticsLinkIdentity
  metrics: AnalyticsMetrics
  trend: AnalyticsTrendPoint[]
  breakdowns: AnalyticsBreakdowns
  quality: AnalyticsDataQuality
  hasData: boolean
}
