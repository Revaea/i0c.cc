import "server-only";

import { readAnalyticsSourceId } from "./configuration";
import { getDatabase, isDatabaseConfigured } from "./database";
import type {
  AnalyticsDateRange,
  AnalyticsDetail,
  AnalyticsDimensionPoint,
  AnalyticsLinkSummary,
  AnalyticsMetricTotals,
  AnalyticsOverview,
  AnalyticsRange,
  AnalyticsSeriesPoint,
} from "./types";

export type { AnalyticsDetail, AnalyticsOverview, AnalyticsRange } from "./types";

type DatabaseNumber = bigint | number | string | null;

interface MetricsRow {
  requests: DatabaseNumber;
  clicks: DatabaseNumber;
  previews: DatabaseNumber;
  bots: DatabaseNumber;
  errors: DatabaseNumber;
  latency_ms_sum: DatabaseNumber;
}

interface SeriesRow {
  timestamp: Date | string;
  requests: DatabaseNumber;
  clicks: DatabaseNumber;
  previews: DatabaseNumber;
  bots: DatabaseNumber;
  errors: DatabaseNumber;
}

interface DimensionRow {
  key: string;
  requests: DatabaseNumber;
  clicks: DatabaseNumber;
}

interface LinkSummaryRow {
  analytics_id: string;
  route_path: string;
  link_type: "redirect" | "proxy";
  requests: DatabaseNumber;
  clicks: DatabaseNumber;
  previews: DatabaseNumber;
  bots: DatabaseNumber;
  errors: DatabaseNumber;
  previous_clicks: DatabaseNumber;
}

interface LinkRow {
  analytics_id: string;
  route_path: string;
  link_type: "redirect" | "proxy";
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

const rangeDays: Record<AnalyticsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

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
  const latencyMsSum = toNumber(row?.latency_ms_sum ?? null);

  return {
    requests,
    clicks: toNumber(row?.clicks ?? null),
    previews: toNumber(row?.previews ?? null),
    bots: toNumber(row?.bots ?? null),
    errors: toNumber(row?.errors ?? null),
    avgLatencyMs: requests > 0 ? latencyMsSum / requests : null,
  };
}

function mapSeries(rows: SeriesRow[]): AnalyticsSeriesPoint[] {
  return rows.map((row) => ({
    timestamp: toIsoString(row.timestamp),
    requests: toNumber(row.requests),
    clicks: toNumber(row.clicks),
    previews: toNumber(row.previews),
    bots: toNumber(row.bots),
    errors: toNumber(row.errors),
  }));
}

function mapDimensions(rows: DimensionRow[]): AnalyticsDimensionPoint[] {
  return rows.map((row) => ({
    key: row.key,
    requests: toNumber(row.requests),
    clicks: toNumber(row.clicks),
  }));
}

async function getTotals(
  sourceId: string,
  range: QueryRange,
  analyticsId: string | null,
): Promise<AnalyticsMetricTotals> {
  const sql = getDatabase();
  const [row] = await sql<MetricsRow[]>`
    SELECT
      COALESCE(SUM(requests), 0) AS requests,
      COALESCE(SUM(human_requests), 0) AS clicks,
      COALESCE(SUM(preview_requests), 0) AS previews,
      COALESCE(SUM(bot_requests), 0) AS bots,
      COALESCE(SUM(error_requests), 0) AS errors,
      COALESCE(SUM(latency_ms_sum), 0) AS latency_ms_sum
    FROM link_stats_hourly
    WHERE source_id = ${sourceId}
      AND bucket_start >= ${range.start}
      AND bucket_start < ${range.end}
      AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
  `;

  return toMetricTotals(row);
}

async function getSeries(
  sourceId: string,
  range: QueryRange,
  analyticsId: string | null,
): Promise<AnalyticsSeriesPoint[]> {
  const sql = getDatabase();
  const rows = await sql<SeriesRow[]>`
    WITH days AS (
      SELECT generate_series(
        ${range.start}::TIMESTAMPTZ,
        date_trunc('day', ${range.end}::TIMESTAMPTZ),
        INTERVAL '1 day'
      ) AS bucket_day
    ), stats AS (
      SELECT
        date_trunc('day', bucket_start) AS bucket_day,
        SUM(requests) AS requests,
        SUM(human_requests) AS clicks,
        SUM(preview_requests) AS previews,
        SUM(bot_requests) AS bots,
        SUM(error_requests) AS errors
      FROM link_stats_hourly
      WHERE source_id = ${sourceId}
        AND bucket_start >= ${range.start}
        AND bucket_start < ${range.end}
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY date_trunc('day', bucket_start)
    )
    SELECT
      days.bucket_day AS timestamp,
      COALESCE(stats.requests, 0) AS requests,
      COALESCE(stats.clicks, 0) AS clicks,
      COALESCE(stats.previews, 0) AS previews,
      COALESCE(stats.bots, 0) AS bots,
      COALESCE(stats.errors, 0) AS errors
    FROM days
    LEFT JOIN stats USING (bucket_day)
    ORDER BY days.bucket_day ASC
  `;

  return mapSeries(rows);
}

async function getDimensions(
  sourceId: string,
  range: QueryRange,
  analyticsId: string | null,
): Promise<{
  countries: AnalyticsDimensionPoint[];
  referrers: AnalyticsDimensionPoint[];
  devices: AnalyticsDimensionPoint[];
  providers: AnalyticsDimensionPoint[];
}> {
  const sql = getDatabase();
  const [countryRows, referrerRows, deviceRows, providerRows] = await Promise.all([
    sql<DimensionRow[]>`
      WITH countries AS (
        SELECT
          country_code AS key,
          SUM(requests) AS requests,
          SUM(human_requests) AS clicks
        FROM link_stats_daily_country
        WHERE source_id = ${sourceId}
          AND bucket_day >= ${range.startDay}
          AND bucket_day < ${range.endDay}
          AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
        GROUP BY country_code
      ), ranked AS (
        SELECT
          key,
          requests,
          clicks,
          ROW_NUMBER() OVER (ORDER BY requests DESC, key ASC) AS rank
        FROM countries
      )
      SELECT key, requests, clicks
      FROM ranked
      WHERE rank <= 10 OR key = 'unknown'
      ORDER BY requests DESC, key ASC
    `,
    sql<DimensionRow[]>`
      SELECT referrer_domain AS key, SUM(requests) AS requests, SUM(human_requests) AS clicks
      FROM link_stats_daily_referrer
      WHERE source_id = ${sourceId}
        AND bucket_day >= ${range.startDay}
        AND bucket_day < ${range.endDay}
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY referrer_domain
      ORDER BY SUM(requests) DESC, referrer_domain ASC
      LIMIT 10
    `,
    sql<DimensionRow[]>`
      SELECT device_type AS key, SUM(requests) AS requests, SUM(human_requests) AS clicks
      FROM link_stats_daily_device
      WHERE source_id = ${sourceId}
        AND bucket_day >= ${range.startDay}
        AND bucket_day < ${range.endDay}
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY device_type
      ORDER BY SUM(requests) DESC, device_type ASC
      LIMIT 10
    `,
    sql<DimensionRow[]>`
      SELECT provider AS key, SUM(requests) AS requests, SUM(human_requests) AS clicks
      FROM link_stats_daily_provider
      WHERE source_id = ${sourceId}
        AND bucket_day >= ${range.startDay}
        AND bucket_day < ${range.endDay}
        AND (${analyticsId}::TEXT IS NULL OR analytics_id = ${analyticsId})
      GROUP BY provider
      ORDER BY SUM(requests) DESC, provider ASC
      LIMIT 10
    `,
  ]);

  return {
    countries: mapDimensions(countryRows),
    referrers: mapDimensions(referrerRows),
    devices: mapDimensions(deviceRows),
    providers: mapDimensions(providerRows),
  };
}

async function getLinkSummaries(
  sourceId: string,
  range: QueryRange,
): Promise<AnalyticsLinkSummary[]> {
  const sql = getDatabase();
  const rows = await sql<LinkSummaryRow[]>`
    WITH current_stats AS (
      SELECT
        analytics_id,
        SUM(requests) AS requests,
        SUM(human_requests) AS clicks,
        SUM(preview_requests) AS previews,
        SUM(bot_requests) AS bots,
        SUM(error_requests) AS errors
      FROM link_stats_hourly
      WHERE source_id = ${sourceId}
        AND bucket_start >= ${range.start}
        AND bucket_start < ${range.end}
      GROUP BY analytics_id
    ), previous_stats AS (
      SELECT analytics_id, SUM(human_requests) AS clicks
      FROM link_stats_hourly
      WHERE source_id = ${sourceId}
        AND bucket_start >= ${range.previousStart}
        AND bucket_start < ${range.previousEnd}
      GROUP BY analytics_id
    )
    SELECT
      link.analytics_id,
      link.route_path,
      link.link_type,
      current_stats.requests,
      current_stats.clicks,
      current_stats.previews,
      current_stats.bots,
      current_stats.errors,
      COALESCE(previous_stats.clicks, 0) AS previous_clicks
    FROM analytics_link AS link
    LEFT JOIN current_stats
      ON current_stats.analytics_id = link.analytics_id
    LEFT JOIN previous_stats
      ON previous_stats.analytics_id = link.analytics_id
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

    return {
      analyticsId: row.analytics_id,
      path: row.route_path,
      linkType: row.link_type,
      requests: toNumber(row.requests),
      clicks,
      previews: toNumber(row.previews),
      bots: toNumber(row.bots),
      errors: toNumber(row.errors),
      trendPercent:
        previousClicks > 0 ? ((clicks - previousClicks) / previousClicks) * 100 : null,
    };
  });
}

export function isAnalyticsConfigured(): boolean {
  return isDatabaseConfigured() && readAnalyticsSourceId() !== null;
}

export async function getAnalyticsLinkSummaries(
  rangeKey: AnalyticsRange,
): Promise<AnalyticsLinkSummary[]> {
  const sourceId = resolveSourceId();
  return getLinkSummaries(sourceId, resolveRange(rangeKey));
}

export async function getAnalyticsOverview(
  rangeKey: AnalyticsRange,
): Promise<AnalyticsOverview> {
  const sourceId = resolveSourceId();
  const range = resolveRange(rangeKey);
  const [totals, series, links, dimensions] = await Promise.all([
    getTotals(sourceId, range, null),
    getSeries(sourceId, range, null),
    getLinkSummaries(sourceId, range),
    getDimensions(sourceId, range, null),
  ]);

  return {
    range: range.publicRange,
    totals,
    series,
    links,
    ...dimensions,
  };
}

export async function getAnalyticsDetail(
  analyticsId: string,
  rangeKey: AnalyticsRange,
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

  const range = resolveRange(rangeKey);
  const [totals, series, dimensions] = await Promise.all([
    getTotals(sourceId, range, analyticsId),
    getSeries(sourceId, range, analyticsId),
    getDimensions(sourceId, range, analyticsId),
  ]);

  return {
    range: range.publicRange,
    link: {
      analyticsId: link.analytics_id,
      path: link.route_path,
      linkType: link.link_type,
    },
    totals,
    series,
    ...dimensions,
  };
}
