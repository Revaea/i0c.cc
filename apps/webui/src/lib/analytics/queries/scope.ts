import "server-only";

import { unstable_cache } from "next/cache";

import { analyticsCacheTag } from "../cache";
import { readAnalyticsSourceId } from "../configuration";
import { getDatabase } from "../database";
import type {
  AnalyticsDateRange,
  AnalyticsEntryDomainOption,
  AnalyticsQueryScope,
  AnalyticsRange,
  AnalyticsScope,
} from "../types";
import { toNumber, type DatabaseNumber } from "./database-values";

interface EntryDomainRow {
  entry_domain: string;
  requests: DatabaseNumber;
  entry_requests: DatabaseNumber;
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

export interface ResolvedQueryScope {
  entryDomain: string;
  range: QueryRange;
}

export interface SeriesBucket {
  unit: "hour" | "day";
  step: "1 hour" | "1 day";
}

const rangeDays: Record<AnalyticsRange, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export const analyticsCacheSeconds = 15;

export function resolveSourceId(): string {
  const sourceId = readAnalyticsSourceId();
  if (!sourceId) {
    throw new Error("Analytics is not configured: ANALYTICS_SOURCE_ID is missing");
  }

  return sourceId;
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

export function resolveSeriesBucket(range: AnalyticsRange): SeriesBucket {
  return range === "1d"
    ? { unit: "hour", step: "1 hour" }
    : { unit: "day", step: "1 day" };
}

async function queryAvailableEntryDomains(
  sourceId: string,
): Promise<AnalyticsEntryDomainOption[]> {
  const sql = getDatabase();
  const rows = await sql<EntryDomainRow[]>`
    WITH entry_domain_totals AS (
      SELECT
        entry_domain,
        SUM(requests)::DOUBLE PRECISION AS requests,
        SUM(entry_requests)::DOUBLE PRECISION AS entry_requests
      FROM link_stats_hourly_domain
      WHERE source_id = ${sourceId}
      GROUP BY entry_domain

      UNION ALL

      SELECT
        entry_domain,
        SUM(estimated_requests) AS requests,
        SUM(entry_estimated_requests) AS entry_requests
      FROM runtime_stats_hourly
      WHERE source_id = ${sourceId}
      GROUP BY entry_domain
    )
    SELECT
      entry_domain,
      SUM(requests) AS requests,
      SUM(entry_requests) AS entry_requests
    FROM entry_domain_totals
    GROUP BY entry_domain
    ORDER BY entry_domain ASC
  `;

  return rows.map((row) => ({
    value: row.entry_domain,
    requests: toNumber(row.requests),
    entryRequests: toNumber(row.entry_requests),
  }));
}

const getAvailableEntryDomains = unstable_cache(
  queryAvailableEntryDomains,
  ["analytics-entry-domains-v1"],
  { revalidate: analyticsCacheSeconds, tags: [analyticsCacheTag] },
);

export async function resolveScope(
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
