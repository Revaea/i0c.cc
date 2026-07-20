import "server-only";

import { readAnalyticsSourceId } from "./configuration";
import { getDatabase, isDatabaseConfigured } from "./database";
import type {
  AnalyticsAutomationDimensionPoint,
  AnalyticsAutomationLinkSummary,
  AnalyticsAutomationOverview,
  AnalyticsAutomationSeriesPoint,
  AnalyticsAutomationTotals,
  AnalyticsBotBreakdowns,
  AnalyticsDateRange,
  AnalyticsDetail,
  AnalyticsDimensionPoint,
  AnalyticsEntryDomainOption,
  AnalyticsLinkSummary,
  AnalyticsMetricTotals,
  AnalyticsOverview,
  AnalyticsQueryScope,
  AnalyticsRange,
  AnalyticsScope,
  AnalyticsSeriesPoint,
} from "./types";

export type {
  AnalyticsAutomationOverview,
  AnalyticsDetail,
  AnalyticsOverview,
  AnalyticsQueryScope,
  AnalyticsRange,
} from "./types";

type DatabaseNumber = bigint | number | string | null;

interface MetricsRow {
  requests: DatabaseNumber;
  entry_requests: DatabaseNumber;
  clicks: DatabaseNumber;
  entry_clicks: DatabaseNumber;
  previews: DatabaseNumber;
  bots: DatabaseNumber;
  suspected_automation: DatabaseNumber;
  errors: DatabaseNumber;
  latency_ms_sum: DatabaseNumber;
}

interface SeriesRow extends MetricsRow {
  timestamp: Date | string;
}

interface DimensionRow {
  dimension: string;
  key: string;
  label: string | null;
  requests: DatabaseNumber;
  clicks: DatabaseNumber;
}

interface AutomationDimensionRow {
  dimension: string;
  key: string;
  label: string | null;
  observed_requests: DatabaseNumber;
  estimated_requests: DatabaseNumber;
}

interface EntryDomainRow {
  entry_domain: string;
  requests: DatabaseNumber;
  entry_requests: DatabaseNumber;
}

interface LinkSummaryRow {
  analytics_id: string;
  route_path: string;
  link_type: "redirect" | "proxy";
  requests: DatabaseNumber;
  entry_requests: DatabaseNumber;
  clicks: DatabaseNumber;
  entry_clicks: DatabaseNumber;
  previews: DatabaseNumber;
  bots: DatabaseNumber;
  suspected_automation: DatabaseNumber;
  errors: DatabaseNumber;
  previous_clicks: DatabaseNumber;
}

interface LinkRow {
  analytics_id: string;
  route_path: string;
  link_type: "redirect" | "proxy";
}

interface AutomationTotalsRow {
  observed_requests: DatabaseNumber;
  estimated_requests: DatabaseNumber;
  observed_declared_bots: DatabaseNumber;
  estimated_declared_bots: DatabaseNumber;
  observed_suspected_automation: DatabaseNumber;
  estimated_suspected_automation: DatabaseNumber;
  observed_unmatched: DatabaseNumber;
  estimated_unmatched: DatabaseNumber;
  observed_errors: DatabaseNumber;
  estimated_errors: DatabaseNumber;
}

interface AutomationSeriesRow extends AutomationTotalsRow {
  timestamp: Date | string;
}

interface AutomationLinkRow {
  analytics_id: string;
  route_path: string;
  link_type: "redirect" | "proxy";
  observed_requests: DatabaseNumber;
  estimated_requests: DatabaseNumber;
}

interface QueryRange {
  publicRange: AnalyticsDateRange;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  startDay: string;
  endDay: string;
}

interface ResolvedQueryScope {
  entryDomain: string;
  range: QueryRange;
}

interface DimensionGroups {
  countries: AnalyticsDimensionPoint[];
  referrers: AnalyticsDimensionPoint[];
  devices: AnalyticsDimensionPoint[];
  providers: AnalyticsDimensionPoint[];
  campaigns: AnalyticsDimensionPoint[];
  upstreamLinks: AnalyticsDimensionPoint[];
}

const rangeDays: Record<AnalyticsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const emptyBotBreakdowns = (): AnalyticsBotBreakdowns => ({
  trafficClasses: [],
  categories: [],
  confidences: [],
  classifierVersions: [],
  resourceClasses: [],
  matchKinds: [],
  outcomes: [],
  probes: [],
});

function resolveSourceId(): string {
  const sourceId = readAnalyticsSourceId();
  if (!sourceId) {
    throw new Error("Analytics is not configured: ANALYTICS_SOURCE_ID is missing");
  }

  return sourceId;
}

function toNumber(value: DatabaseNumber): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function resolveRange(range: AnalyticsRange, now = new Date()): QueryRange {
  const days = rangeDays[range];
  const end = new Date(now);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const previousEnd = new Date(start);
  const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
  const endDayExclusive = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1),
  );

  return {
    publicRange: {
      key: range,
      start: start.toISOString(),
      end: end.toISOString(),
    },
    start,
    end,
    previousStart,
    previousEnd,
    startDay: start.toISOString().slice(0, 10),
    endDay: endDayExclusive.toISOString().slice(0, 10),
  };
}

function toMetricTotals(row: MetricsRow | undefined): AnalyticsMetricTotals {
  const requests = toNumber(row?.requests ?? null);
  const bots = toNumber(row?.bots ?? null);
  const previews = toNumber(row?.previews ?? null);
  const suspectedAutomation = toNumber(row?.suspected_automation ?? null);
  const latencyMsSum = toNumber(row?.latency_ms_sum ?? null);

  return {
    requests,
    entryRequests: toNumber(row?.entry_requests ?? null),
    clicks: toNumber(row?.clicks ?? null),
    entryClicks: toNumber(row?.entry_clicks ?? null),
    previews,
    bots: bots + previews + suspectedAutomation,
    declaredBots: bots + previews,
    suspectedAutomation,
    errors: toNumber(row?.errors ?? null),
    avgLatencyMs: requests > 0 ? latencyMsSum / requests : null,
  };
}

function mapSeries(rows: SeriesRow[]): AnalyticsSeriesPoint[] {
  return rows.map((row) => {
    const bots = toNumber(row.bots);
    const previews = toNumber(row.previews);
    const suspectedAutomation = toNumber(row.suspected_automation);

    return {
      timestamp: toIsoString(row.timestamp),
      requests: toNumber(row.requests),
      entryRequests: toNumber(row.entry_requests),
      clicks: toNumber(row.clicks),
      entryClicks: toNumber(row.entry_clicks),
      previews,
      bots: bots + previews + suspectedAutomation,
      declaredBots: bots + previews,
      suspectedAutomation,
      errors: toNumber(row.errors),
    };
  });
}

function mapDimensions(rows: DimensionRow[]): DimensionGroups {
  const groups: DimensionGroups = {
    countries: [],
    referrers: [],
    devices: [],
    providers: [],
    campaigns: [],
    upstreamLinks: [],
  };

  for (const row of rows) {
    const key = row.dimension as keyof DimensionGroups;
    if (!(key in groups)) {
      continue;
    }

    groups[key].push({
      key: row.key,
      label: row.label ?? undefined,
      requests: toNumber(row.requests),
      clicks: toNumber(row.clicks),
    });
  }

  return groups;
}

function mapAutomationDimensions(rows: AutomationDimensionRow[]): AnalyticsBotBreakdowns {
  const groups = emptyBotBreakdowns();
  const dimensionMap: Record<string, keyof AnalyticsBotBreakdowns> = {
    trafficClasses: "trafficClasses",
    categories: "categories",
    confidences: "confidences",
    classifierVersions: "classifierVersions",
    resourceClasses: "resourceClasses",
    matchKinds: "matchKinds",
    outcomes: "outcomes",
    probes: "probes",
  };

  for (const row of rows) {
    const group = dimensionMap[row.dimension];
    if (!group) {
      continue;
    }

    groups[group].push({
      key: row.key,
      label: row.label ?? undefined,
      observedRequests: toNumber(row.observed_requests),
      estimatedRequests: toNumber(row.estimated_requests),
    });
  }

  return groups;
}

async function getAvailableEntryDomains(
  sourceId: string,
): Promise<AnalyticsEntryDomainOption[]> {
  const sql = getDatabase();
  const rows = await sql<EntryDomainRow[]>`
    SELECT
      entry_domain,
      0::BIGINT AS requests,
      0::BIGINT AS entry_requests
    FROM runtime_stats_hourly
    WHERE source_id = ${sourceId}
    GROUP BY entry_domain
    ORDER BY entry_domain ASC
  `;

  return rows.map((row) => ({
      value: row.entry_domain,
      requests: toNumber(row.requests),
      entryRequests: toNumber(row.entry_requests),
  }));
}

async function resolveScope(
  sourceId: string,
  input: AnalyticsQueryScope,
): Promise<{ publicScope: AnalyticsScope; queryScope: ResolvedQueryScope }> {
  const range = resolveRange(input.range);
  const availableEntryDomains = await getAvailableEntryDomains(sourceId);
  const requestedEntryDomain = input.entryDomain.trim().toLowerCase() || "all";
  const isAvailable = availableEntryDomains.some(
    (option) => option.value === requestedEntryDomain,
  );
  const entryDomain = requestedEntryDomain === "all" || isAvailable
    ? requestedEntryDomain
    : "all";

  return {
    publicScope: { entryDomain, availableEntryDomains },
    queryScope: { entryDomain, range },
  };
}

async function getTotals(
  sourceId: string,
  scope: ResolvedQueryScope,
  analyticsId: string | null,
): Promise<AnalyticsMetricTotals> {
  const sql = getDatabase();
  const [row] = await sql<MetricsRow[]>`
    SELECT
      COALESCE(SUM(requests), 0) AS requests,
      COALESCE(SUM(entry_requests), 0) AS entry_requests,
      COALESCE(SUM(human_requests), 0) AS clicks,
      COALESCE(SUM(entry_human_requests), 0) AS entry_clicks,
      COALESCE(SUM(preview_requests), 0) AS previews,
      COALESCE(SUM(bot_requests), 0) AS bots,
      COALESCE(SUM(suspected_automation_requests), 0) AS suspected_automation,
      COALESCE(SUM(error_requests), 0) AS errors,
      COALESCE(SUM(latency_ms_sum), 0) AS latency_ms_sum
    FROM link_stats_hourly_domain
    WHERE source_id = ${sourceId}
      AND bucket_start >= ${scope.range.start}
      AND bucket_start < ${scope.range.end}
      AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
  `;

  return toMetricTotals(row);
}

async function getSeries(
  sourceId: string,
  scope: ResolvedQueryScope,
  analyticsId: string | null,
): Promise<AnalyticsSeriesPoint[]> {
  const sql = getDatabase();
  const rows = await sql<SeriesRow[]>`
    WITH days AS (
      SELECT generate_series(
        ${scope.range.start}::TIMESTAMPTZ,
        date_trunc('day', ${scope.range.end}::TIMESTAMPTZ AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
        INTERVAL '1 day'
      ) AS bucket_day
    ), stats AS (
      SELECT
        date_trunc('day', bucket_start AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket_day,
        SUM(requests) AS requests,
        SUM(entry_requests) AS entry_requests,
        SUM(human_requests) AS clicks,
        SUM(entry_human_requests) AS entry_clicks,
        SUM(preview_requests) AS previews,
        SUM(bot_requests) AS bots,
        SUM(suspected_automation_requests) AS suspected_automation,
        SUM(error_requests) AS errors,
        SUM(latency_ms_sum) AS latency_ms_sum
      FROM link_stats_hourly_domain
      WHERE source_id = ${sourceId}
        AND bucket_start >= ${scope.range.start}
        AND bucket_start < ${scope.range.end}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY date_trunc('day', bucket_start AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    )
    SELECT
      days.bucket_day AS timestamp,
      COALESCE(stats.requests, 0) AS requests,
      COALESCE(stats.entry_requests, 0) AS entry_requests,
      COALESCE(stats.clicks, 0) AS clicks,
      COALESCE(stats.entry_clicks, 0) AS entry_clicks,
      COALESCE(stats.previews, 0) AS previews,
      COALESCE(stats.bots, 0) AS bots,
      COALESCE(stats.suspected_automation, 0) AS suspected_automation,
      COALESCE(stats.errors, 0) AS errors,
      COALESCE(stats.latency_ms_sum, 0) AS latency_ms_sum
    FROM days
    LEFT JOIN stats USING (bucket_day)
    ORDER BY days.bucket_day ASC
  `;

  return mapSeries(rows);
}

async function getDimensions(
  sourceId: string,
  scope: ResolvedQueryScope,
  analyticsId: string | null,
): Promise<DimensionGroups> {
  const sql = getDatabase();
  const rows = await sql<DimensionRow[]>`
    WITH dimensions AS (
      SELECT
        'countries'::TEXT AS dimension,
        country_code::TEXT AS key,
        NULL::TEXT AS label,
        SUM(requests) AS requests,
        SUM(human_requests) AS clicks
      FROM link_stats_daily_country_domain
      WHERE source_id = ${sourceId}
        AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY country_code

      UNION ALL

      SELECT 'referrers', referrer_domain, NULL::TEXT, SUM(requests), SUM(human_requests)
      FROM link_stats_daily_referrer_domain
      WHERE source_id = ${sourceId}
        AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY referrer_domain

      UNION ALL

      SELECT 'devices', device_type, NULL::TEXT, SUM(requests), SUM(human_requests)
      FROM link_stats_daily_device_domain
      WHERE source_id = ${sourceId}
        AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY device_type

      UNION ALL

      SELECT 'providers', provider, NULL::TEXT, SUM(requests), SUM(human_requests)
      FROM link_stats_daily_provider_domain
      WHERE source_id = ${sourceId}
        AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY provider

      UNION ALL

      SELECT 'campaigns', campaign_id, NULL::TEXT, SUM(requests), SUM(human_requests)
      FROM link_stats_daily_campaign_domain
      WHERE source_id = ${sourceId}
        AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY campaign_id

      UNION ALL

      SELECT
        'upstreamLinks',
        stats.upstream_analytics_id,
        COALESCE(link.route_path, stats.upstream_analytics_id),
        SUM(stats.requests),
        SUM(stats.human_requests)
      FROM link_stats_daily_upstream_domain AS stats
      LEFT JOIN analytics_link AS link
        ON link.source_id = stats.source_id
       AND link.analytics_id = stats.upstream_analytics_id
      WHERE stats.source_id = ${sourceId}
        AND stats.bucket_day >= ${scope.range.startDay}
        AND stats.bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR stats.entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR stats.analytics_id = ${analyticsId})
      GROUP BY stats.upstream_analytics_id, link.route_path
    ), ranked AS (
      SELECT
        dimension,
        key,
        label,
        requests,
        clicks,
        ROW_NUMBER() OVER (PARTITION BY dimension ORDER BY requests DESC, key ASC) AS rank
      FROM dimensions
    )
    SELECT dimension, key, label, requests, clicks
    FROM ranked
    WHERE rank <= 10 OR (dimension = 'countries' AND key = 'unknown')
    ORDER BY dimension ASC, requests DESC, key ASC
  `;

  return mapDimensions(rows);
}

async function getLinkBotBreakdowns(
  sourceId: string,
  scope: ResolvedQueryScope,
  analyticsId: string | null,
): Promise<AnalyticsBotBreakdowns> {
  const sql = getDatabase();
  const rows = await sql<AutomationDimensionRow[]>`
    WITH dimensions AS (
      SELECT 'trafficClasses'::TEXT AS dimension, traffic_class::TEXT AS key,
        NULL::TEXT AS label, SUM(observed_requests) AS observed_requests,
        SUM(estimated_requests) AS estimated_requests
      FROM link_stats_daily_bot
      WHERE source_id = ${sourceId}
        AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY traffic_class

      UNION ALL
      SELECT 'categories', bot_category, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM link_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY bot_category

      UNION ALL
      SELECT 'confidences', bot_confidence, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM link_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY bot_confidence

      UNION ALL
      SELECT 'classifierVersions', classifier_version::TEXT, NULL::TEXT,
        SUM(observed_requests), SUM(estimated_requests)
      FROM link_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY classifier_version

      UNION ALL
      SELECT 'resourceClasses', resource_class, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM link_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY resource_class

      UNION ALL
      SELECT 'matchKinds', match_kind, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM link_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY match_kind

      UNION ALL
      SELECT 'probes', probe_category, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM link_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY probe_category
    ), ranked AS (
      SELECT *, ROW_NUMBER() OVER (
        PARTITION BY dimension ORDER BY estimated_requests DESC, key ASC
      ) AS rank
      FROM dimensions
    )
    SELECT dimension, key, label, observed_requests, estimated_requests
    FROM ranked
    WHERE rank <= 10
    ORDER BY dimension ASC, estimated_requests DESC, key ASC
  `;

  return mapAutomationDimensions(rows);
}

async function getLinkSummaries(
  sourceId: string,
  scope: ResolvedQueryScope,
): Promise<AnalyticsLinkSummary[]> {
  const sql = getDatabase();
  const rows = await sql<LinkSummaryRow[]>`
    WITH current_stats AS (
      SELECT
        analytics_id,
        SUM(requests) AS requests,
        SUM(entry_requests) AS entry_requests,
        SUM(human_requests) AS clicks,
        SUM(entry_human_requests) AS entry_clicks,
        SUM(preview_requests) AS previews,
        SUM(bot_requests) AS bots,
        SUM(suspected_automation_requests) AS suspected_automation,
        SUM(error_requests) AS errors
      FROM link_stats_hourly_domain
      WHERE source_id = ${sourceId}
        AND bucket_start >= ${scope.range.start}
        AND bucket_start < ${scope.range.end}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY analytics_id
    ), previous_stats AS (
      SELECT analytics_id, SUM(human_requests) AS clicks
      FROM link_stats_hourly_domain
      WHERE source_id = ${sourceId}
        AND bucket_start >= ${scope.range.previousStart}
        AND bucket_start < ${scope.range.previousEnd}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY analytics_id
    )
    SELECT
      link.analytics_id,
      link.route_path,
      link.link_type,
      current_stats.requests,
      current_stats.entry_requests,
      current_stats.clicks,
      current_stats.entry_clicks,
      current_stats.previews,
      current_stats.bots,
      current_stats.suspected_automation,
      current_stats.errors,
      COALESCE(previous_stats.clicks, 0) AS previous_clicks
    FROM analytics_link AS link
    LEFT JOIN current_stats ON current_stats.analytics_id = link.analytics_id
    LEFT JOIN previous_stats ON previous_stats.analytics_id = link.analytics_id
    WHERE link.source_id = ${sourceId}
    ORDER BY
      COALESCE(current_stats.clicks, 0) DESC,
      COALESCE(current_stats.requests, 0) DESC,
      link.route_path ASC
    LIMIT 500
  `;

  return rows.map((row) => {
    const clicks = toNumber(row.clicks);
    const previousClicks = toNumber(row.previous_clicks);
    const declaredBots = toNumber(row.bots);
    const previews = toNumber(row.previews);
    const suspectedAutomation = toNumber(row.suspected_automation);

    return {
      analyticsId: row.analytics_id,
      path: row.route_path,
      linkType: row.link_type,
      requests: toNumber(row.requests),
      entryRequests: toNumber(row.entry_requests),
      clicks,
      entryClicks: toNumber(row.entry_clicks),
      previews,
      bots: declaredBots + previews + suspectedAutomation,
      declaredBots: declaredBots + previews,
      suspectedAutomation,
      errors: toNumber(row.errors),
      trendPercent: previousClicks > 0 ? ((clicks - previousClicks) / previousClicks) * 100 : null,
    };
  });
}

function toAutomationTotals(row: AutomationTotalsRow | undefined): AnalyticsAutomationTotals {
  return {
    observedRequests: toNumber(row?.observed_requests ?? null),
    estimatedRequests: toNumber(row?.estimated_requests ?? null),
    observedDeclaredBots: toNumber(row?.observed_declared_bots ?? null),
    estimatedDeclaredBots: toNumber(row?.estimated_declared_bots ?? null),
    observedSuspectedAutomation: toNumber(row?.observed_suspected_automation ?? null),
    estimatedSuspectedAutomation: toNumber(row?.estimated_suspected_automation ?? null),
    observedUnmatched: toNumber(row?.observed_unmatched ?? null),
    estimatedUnmatched: toNumber(row?.estimated_unmatched ?? null),
    observedErrors: toNumber(row?.observed_errors ?? null),
    estimatedErrors: toNumber(row?.estimated_errors ?? null),
  };
}

async function getAutomationTotals(
  sourceId: string,
  scope: ResolvedQueryScope,
): Promise<AnalyticsAutomationTotals> {
  const sql = getDatabase();
  const [row] = await sql<AutomationTotalsRow[]>`
    SELECT
      COALESCE(SUM(observed_requests), 0) AS observed_requests,
      COALESCE(SUM(estimated_requests), 0) AS estimated_requests,
      COALESCE(SUM(declared_bot_observed_requests), 0) AS observed_declared_bots,
      COALESCE(SUM(declared_bot_estimated_requests), 0) AS estimated_declared_bots,
      COALESCE(SUM(suspected_automation_observed_requests), 0) AS observed_suspected_automation,
      COALESCE(SUM(suspected_automation_estimated_requests), 0) AS estimated_suspected_automation,
      COALESCE(SUM(observed_requests) FILTER (WHERE match_kind = 'unmatched'), 0) AS observed_unmatched,
      COALESCE(SUM(estimated_requests) FILTER (WHERE match_kind = 'unmatched'), 0) AS estimated_unmatched,
      COALESCE(SUM(error_observed_requests), 0) AS observed_errors,
      COALESCE(SUM(error_estimated_requests), 0) AS estimated_errors
    FROM runtime_stats_hourly
    WHERE source_id = ${sourceId}
      AND bucket_start >= ${scope.range.start}
      AND bucket_start < ${scope.range.end}
      AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
  `;

  return toAutomationTotals(row);
}

async function getAutomationSeries(
  sourceId: string,
  scope: ResolvedQueryScope,
): Promise<AnalyticsAutomationSeriesPoint[]> {
  const sql = getDatabase();
  const rows = await sql<AutomationSeriesRow[]>`
    WITH days AS (
      SELECT generate_series(
        ${scope.range.start}::TIMESTAMPTZ,
        date_trunc('day', ${scope.range.end}::TIMESTAMPTZ AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',
        INTERVAL '1 day'
      ) AS bucket_day
    ), stats AS (
      SELECT
        date_trunc('day', bucket_start AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket_day,
        SUM(observed_requests) AS observed_requests,
        SUM(estimated_requests) AS estimated_requests,
        SUM(declared_bot_observed_requests) AS observed_declared_bots,
        SUM(declared_bot_estimated_requests) AS estimated_declared_bots,
        SUM(suspected_automation_observed_requests) AS observed_suspected_automation,
        SUM(suspected_automation_estimated_requests) AS estimated_suspected_automation,
        SUM(observed_requests) FILTER (WHERE match_kind = 'unmatched') AS observed_unmatched,
        SUM(estimated_requests) FILTER (WHERE match_kind = 'unmatched') AS estimated_unmatched,
        SUM(error_observed_requests) AS observed_errors,
        SUM(error_estimated_requests) AS estimated_errors
      FROM runtime_stats_hourly
      WHERE source_id = ${sourceId}
        AND bucket_start >= ${scope.range.start}
        AND bucket_start < ${scope.range.end}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY date_trunc('day', bucket_start AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    )
    SELECT
      days.bucket_day AS timestamp,
      COALESCE(stats.observed_requests, 0) AS observed_requests,
      COALESCE(stats.estimated_requests, 0) AS estimated_requests,
      COALESCE(stats.observed_declared_bots, 0) AS observed_declared_bots,
      COALESCE(stats.estimated_declared_bots, 0) AS estimated_declared_bots,
      COALESCE(stats.observed_suspected_automation, 0) AS observed_suspected_automation,
      COALESCE(stats.estimated_suspected_automation, 0) AS estimated_suspected_automation,
      COALESCE(stats.observed_unmatched, 0) AS observed_unmatched,
      COALESCE(stats.estimated_unmatched, 0) AS estimated_unmatched,
      COALESCE(stats.observed_errors, 0) AS observed_errors,
      COALESCE(stats.estimated_errors, 0) AS estimated_errors
    FROM days
    LEFT JOIN stats USING (bucket_day)
    ORDER BY days.bucket_day ASC
  `;

  return rows.map((row) => ({
    timestamp: toIsoString(row.timestamp),
    ...toAutomationTotals(row),
  }));
}

async function getRuntimeBotBreakdowns(
  sourceId: string,
  scope: ResolvedQueryScope,
): Promise<AnalyticsBotBreakdowns> {
  const sql = getDatabase();
  const rows = await sql<AutomationDimensionRow[]>`
    WITH dimensions AS (
      SELECT 'trafficClasses'::TEXT AS dimension, traffic_class::TEXT AS key,
        NULL::TEXT AS label, SUM(observed_requests) AS observed_requests,
        SUM(estimated_requests) AS estimated_requests
      FROM runtime_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY traffic_class

      UNION ALL
      SELECT 'categories', bot_category, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM runtime_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY bot_category

      UNION ALL
      SELECT 'confidences', bot_confidence, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM runtime_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY bot_confidence

      UNION ALL
      SELECT 'classifierVersions', classifier_version::TEXT, NULL::TEXT,
        SUM(observed_requests), SUM(estimated_requests)
      FROM runtime_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY classifier_version

      UNION ALL
      SELECT 'resourceClasses', resource_class, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM runtime_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY resource_class

      UNION ALL
      SELECT 'matchKinds', match_kind, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM runtime_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY match_kind

      UNION ALL
      SELECT 'outcomes', match_outcome, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM runtime_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY match_outcome

      UNION ALL
      SELECT 'probes', probe_category, NULL::TEXT, SUM(observed_requests), SUM(estimated_requests)
      FROM runtime_stats_daily_bot
      WHERE source_id = ${sourceId} AND bucket_day >= ${scope.range.startDay}
        AND bucket_day < ${scope.range.endDay}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY probe_category
    ), ranked AS (
      SELECT *, ROW_NUMBER() OVER (
        PARTITION BY dimension ORDER BY estimated_requests DESC, key ASC
      ) AS rank
      FROM dimensions
    )
    SELECT dimension, key, label, observed_requests, estimated_requests
    FROM ranked
    WHERE rank <= 10
    ORDER BY dimension ASC, estimated_requests DESC, key ASC
  `;

  return mapAutomationDimensions(rows);
}

async function getAutomationDeliveryDimensions(
  sourceId: string,
  scope: ResolvedQueryScope,
): Promise<{
  providers: AnalyticsAutomationDimensionPoint[];
  entryDomains: AnalyticsAutomationDimensionPoint[];
}> {
  const sql = getDatabase();
  const rows = await sql<AutomationDimensionRow[]>`
    WITH dimensions AS (
      SELECT 'providers'::TEXT AS dimension, provider::TEXT AS key, NULL::TEXT AS label,
        SUM(observed_requests) AS observed_requests, SUM(estimated_requests) AS estimated_requests
      FROM runtime_stats_hourly
      WHERE source_id = ${sourceId} AND bucket_start >= ${scope.range.start}
        AND bucket_start < ${scope.range.end}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY provider

      UNION ALL

      SELECT 'entryDomains', entry_domain, NULL::TEXT,
        SUM(observed_requests), SUM(estimated_requests)
      FROM runtime_stats_hourly
      WHERE source_id = ${sourceId} AND bucket_start >= ${scope.range.start}
        AND bucket_start < ${scope.range.end}
        AND (${scope.entryDomain === "all"} OR entry_domain = ${scope.entryDomain})
      GROUP BY entry_domain
    )
    SELECT dimension, key, label, observed_requests, estimated_requests
    FROM dimensions
    ORDER BY dimension ASC, estimated_requests DESC, key ASC
  `;

  const providers: AnalyticsAutomationDimensionPoint[] = [];
  const entryDomains: AnalyticsAutomationDimensionPoint[] = [];
  for (const row of rows) {
    const item = {
      key: row.key,
      label: row.label ?? undefined,
      observedRequests: toNumber(row.observed_requests),
      estimatedRequests: toNumber(row.estimated_requests),
    };
    if (row.dimension === "providers") {
      providers.push(item);
    } else if (row.dimension === "entryDomains") {
      entryDomains.push(item);
    }
  }

  return { providers, entryDomains };
}

async function getAutomationLinks(
  sourceId: string,
  scope: ResolvedQueryScope,
): Promise<AnalyticsAutomationLinkSummary[]> {
  const sql = getDatabase();
  const rows = await sql<AutomationLinkRow[]>`
    SELECT
      link.analytics_id,
      link.route_path,
      link.link_type,
      SUM(stats.observed_requests) AS observed_requests,
      SUM(stats.estimated_requests) AS estimated_requests
    FROM link_stats_daily_bot AS stats
    INNER JOIN analytics_link AS link
      ON link.source_id = stats.source_id
     AND link.analytics_id = stats.analytics_id
    WHERE stats.source_id = ${sourceId}
      AND stats.bucket_day >= ${scope.range.startDay}
      AND stats.bucket_day < ${scope.range.endDay}
      AND (${scope.entryDomain === "all"} OR stats.entry_domain = ${scope.entryDomain})
      AND stats.traffic_class IN ('declared_bot', 'suspected_automation')
    GROUP BY link.analytics_id, link.route_path, link.link_type
    ORDER BY SUM(stats.estimated_requests) DESC, link.route_path ASC
    LIMIT 20
  `;

  return rows.map((row) => ({
    analyticsId: row.analytics_id,
    path: row.route_path,
    linkType: row.link_type,
    observedRequests: toNumber(row.observed_requests),
    estimatedRequests: toNumber(row.estimated_requests),
  }));
}

export function isAnalyticsConfigured(): boolean {
  return isDatabaseConfigured() && readAnalyticsSourceId() !== null;
}

export async function getAnalyticsLinkSummaries(
  input: AnalyticsQueryScope,
): Promise<AnalyticsLinkSummary[]> {
  const sourceId = resolveSourceId();
  const { queryScope } = await resolveScope(sourceId, input);
  return getLinkSummaries(sourceId, queryScope);
}

export async function getAnalyticsNavigation(input: AnalyticsQueryScope): Promise<{
  links: AnalyticsLinkSummary[];
  scope: AnalyticsScope;
}> {
  const sourceId = resolveSourceId();
  const { publicScope, queryScope } = await resolveScope(sourceId, input);
  const links = await getLinkSummaries(sourceId, queryScope);

  return { links, scope: publicScope };
}

export async function getAnalyticsOverview(
  input: AnalyticsQueryScope,
): Promise<AnalyticsOverview> {
  const sourceId = resolveSourceId();
  const { publicScope, queryScope } = await resolveScope(sourceId, input);
  const totals = await getTotals(sourceId, queryScope, null);
  const series = await getSeries(sourceId, queryScope, null);
  const links = await getLinkSummaries(sourceId, queryScope);
  const dimensions = await getDimensions(sourceId, queryScope, null);
  const botBreakdowns = await getLinkBotBreakdowns(sourceId, queryScope, null);

  return {
    range: queryScope.range.publicRange,
    scope: publicScope,
    totals,
    series,
    links,
    ...dimensions,
    botBreakdowns,
  };
}

export async function getAnalyticsDetail(
  analyticsId: string,
  input: AnalyticsQueryScope,
): Promise<AnalyticsDetail | null> {
  const sourceId = resolveSourceId();
  const sql = getDatabase();
  const [link] = await sql<LinkRow[]>`
    SELECT analytics_id, route_path, link_type
    FROM analytics_link
    WHERE source_id = ${sourceId}
      AND analytics_id = ${analyticsId}
    LIMIT 1
  `;

  if (!link) {
    return null;
  }

  const { publicScope, queryScope } = await resolveScope(sourceId, input);
  const totals = await getTotals(sourceId, queryScope, analyticsId);
  const series = await getSeries(sourceId, queryScope, analyticsId);
  const dimensions = await getDimensions(sourceId, queryScope, analyticsId);
  const botBreakdowns = await getLinkBotBreakdowns(sourceId, queryScope, analyticsId);

  return {
    range: queryScope.range.publicRange,
    scope: publicScope,
    link: {
      analyticsId: link.analytics_id,
      path: link.route_path,
      linkType: link.link_type,
    },
    totals,
    series,
    ...dimensions,
    botBreakdowns,
  };
}

export async function getAnalyticsAutomationOverview(
  input: AnalyticsQueryScope,
): Promise<AnalyticsAutomationOverview> {
  const sourceId = resolveSourceId();
  const { publicScope, queryScope } = await resolveScope(sourceId, input);
  const totals = await getAutomationTotals(sourceId, queryScope);
  const series = await getAutomationSeries(sourceId, queryScope);
  const links = await getAutomationLinks(sourceId, queryScope);
  const delivery = await getAutomationDeliveryDimensions(sourceId, queryScope);
  const botBreakdowns = await getRuntimeBotBreakdowns(sourceId, queryScope);

  return {
    range: queryScope.range.publicRange,
    scope: publicScope,
    totals,
    series,
    links,
    ...delivery,
    botBreakdowns,
  };
}
