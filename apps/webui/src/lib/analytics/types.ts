export const analyticsRanges = ["7d", "30d", "90d"] as const;

export type AnalyticsRange = (typeof analyticsRanges)[number];

export interface AnalyticsDateRange {
  key: AnalyticsRange;
  start: string;
  end: string;
}

export interface AnalyticsMetricTotals {
  requests: number;
  clicks: number;
  previews: number;
  bots: number;
  errors: number;
  avgLatencyMs: number | null;
}

export interface AnalyticsSeriesPoint {
  timestamp: string;
  requests: number;
  clicks: number;
  previews: number;
  bots: number;
  errors: number;
}

export interface AnalyticsDimensionPoint {
  key: string;
  requests: number;
  clicks: number;
}

export interface AnalyticsLinkSummary {
  analyticsId: string;
  path: string;
  linkType: "redirect" | "proxy";
  requests: number;
  clicks: number;
  previews: number;
  bots: number;
  errors: number;
  trendPercent: number | null;
}

export interface AnalyticsOverview {
  range: AnalyticsDateRange;
  totals: AnalyticsMetricTotals;
  series: AnalyticsSeriesPoint[];
  links: AnalyticsLinkSummary[];
  countries: AnalyticsDimensionPoint[];
  referrers: AnalyticsDimensionPoint[];
  devices: AnalyticsDimensionPoint[];
  providers: AnalyticsDimensionPoint[];
}

export interface AnalyticsLink {
  analyticsId: string;
  path: string;
  linkType: "redirect" | "proxy";
}

export interface AnalyticsDetail {
  range: AnalyticsDateRange;
  link: AnalyticsLink;
  totals: AnalyticsMetricTotals;
  series: AnalyticsSeriesPoint[];
  countries: AnalyticsDimensionPoint[];
  referrers: AnalyticsDimensionPoint[];
  devices: AnalyticsDimensionPoint[];
  providers: AnalyticsDimensionPoint[];
}
