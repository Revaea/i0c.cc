import type { AnalyticsRetentionResult } from "@i0c/analytics-domain/store"

import { getDatabase } from "./database";
import type { PostgresAnalyticsStoreConfig } from "./config"

interface AnalyticsRetentionRow {
  cutoffAt: Date | string;
  accessEventsDeleted: number | string;
  runtimeEventsDeleted: number | string;
  eventReceiptsDeleted: number | string;
  upstreamClaimsDeleted: number | string;
}

function parseDeletedCount(value: number | string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("Analytics retention returned an invalid deleted-row count");
  }

  return count;
}

function formatCutoff(value: Date | string): string {
  const cutoff = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(cutoff.getTime())) {
    throw new Error("Analytics retention returned an invalid cutoff timestamp");
  }

  return cutoff.toISOString();
}

export async function pruneExpiredAnalyticsRows(
  config: PostgresAnalyticsStoreConfig,
): Promise<AnalyticsRetentionResult> {
  const sql = getDatabase();
  const rows = await sql<AnalyticsRetentionRow[]>`
    SELECT
      cutoff_at AS "cutoffAt",
      access_events_deleted AS "accessEventsDeleted",
      runtime_events_deleted AS "runtimeEventsDeleted",
      event_receipts_deleted AS "eventReceiptsDeleted",
      upstream_claims_deleted AS "upstreamClaimsDeleted"
    FROM analytics_prune_raw_events()
  `;
  const row = rows[0];

  if (!row) {
    throw new Error("Analytics retention did not return a result");
  }

  return {
    retentionDays: config.retentionDays,
    cutoffAt: formatCutoff(row.cutoffAt),
    deleted: {
      accessEvents: parseDeletedCount(row.accessEventsDeleted),
      runtimeEvents: parseDeletedCount(row.runtimeEventsDeleted),
      eventReceipts: parseDeletedCount(row.eventReceiptsDeleted),
      upstreamClaims: parseDeletedCount(row.upstreamClaimsDeleted),
    },
  };
}
