import "server-only";

import { unstable_cache } from "next/cache";

import { analyticsCacheTag } from "../cache";
import { readAnalyticsSourceId } from "../configuration";
import { getDatabase } from "../database";
import type {
  AnalyticsEntryDomainOption,
  AnalyticsQueryScope,
  AnalyticsScope,
} from "../types";
import { resolveQueryRange, type QueryRange } from "./range";

interface EntryDomainRow {
  entry_domain: string;
}

export interface ResolvedQueryScope {
  entryDomain: string;
  range: QueryRange;
}

export const analyticsCacheSeconds = 15;

export async function resolveSourceId(): Promise<string> {
  const sourceId = await readAnalyticsSourceId();
  if (!sourceId) {
    throw new Error("Analytics source ID in data/config.json is invalid");
  }

  return sourceId;
}

async function queryAvailableEntryDomains(
  sourceId: string,
): Promise<AnalyticsEntryDomainOption[]> {
  const sql = getDatabase();
  const rows = await sql<EntryDomainRow[]>`
    WITH entry_domains AS (
      SELECT
        entry_domain
      FROM link_stats_hourly_domain
      WHERE source_id = ${sourceId}
        AND bucket_start >= (
          DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
          - INTERVAL '89 days'
        )

      UNION

      SELECT
        entry_domain
      FROM runtime_stats_hourly
      WHERE source_id = ${sourceId}
        AND bucket_start >= (
          DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
          - INTERVAL '89 days'
        )
    )
    SELECT
      entry_domain
    FROM entry_domains
    ORDER BY entry_domain ASC
  `;

  return rows.map((row) => ({
    value: row.entry_domain,
  }));
}

const getAvailableEntryDomains = unstable_cache(
  queryAvailableEntryDomains,
  ["analytics-entry-domains-v2"],
  { revalidate: analyticsCacheSeconds, tags: [analyticsCacheTag] },
);

export async function resolveScope(
  sourceId: string,
  input: AnalyticsQueryScope,
): Promise<{ publicScope: AnalyticsScope; queryScope: ResolvedQueryScope }> {
  const range = resolveQueryRange(input.range);
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

export async function normalizeAnalyticsQueryScope(
  sourceId: string,
  input: AnalyticsQueryScope,
): Promise<AnalyticsQueryScope> {
  const { queryScope } = await resolveScope(sourceId, input);
  return {
    range: queryScope.range.publicRange.key,
    entryDomain: queryScope.entryDomain,
  };
}
