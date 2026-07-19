import "server-only";

import { getDatabase } from "./database";
import type { AnalyticsEvent } from "./event-schema";

export interface AnalyticsIngestResult {
  isDuplicate: boolean;
}

function toUtcHour(date: Date): string {
  const hour = new Date(date);
  hour.setUTCMinutes(0, 0, 0);
  return hour.toISOString();
}

function toUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function ingestAnalyticsEvent(
  event: AnalyticsEvent,
): Promise<AnalyticsIngestResult> {
  const sql = getDatabase();
  const occurredAt = new Date(event.occurredAt);
  const bucketHour = toUtcHour(occurredAt);
  const bucketDay = toUtcDay(occurredAt);
  const humanRequests = event.requestClass === "human" ? 1 : 0;
  const previewRequests = event.requestClass === "link_preview" ? 1 : 0;
  const botRequests = event.isBot ? 1 : 0;
  const assetRequests = event.requestClass === "asset" ? 1 : 0;
  const unknownRequests = event.requestClass === "unknown" ? 1 : 0;
  const errorRequests = event.statusCode >= 400 ? 1 : 0;

  const isInserted = await sql.begin(async (transaction) => {
    await transaction`
      INSERT INTO analytics_source (source_id)
      VALUES (${event.sourceId})
      ON CONFLICT (source_id) DO UPDATE
      SET updated_at = NOW()
    `;

    await transaction`
      INSERT INTO analytics_link (
        source_id,
        analytics_id,
        route_path,
        link_type,
        first_seen_at,
        last_seen_at
      )
      VALUES (
        ${event.sourceId},
        ${event.analyticsId},
        ${event.path},
        ${event.linkType},
        ${event.occurredAt},
        ${event.occurredAt}
      )
      ON CONFLICT (source_id, analytics_id) DO UPDATE
      SET route_path = EXCLUDED.route_path,
          link_type = EXCLUDED.link_type,
          first_seen_at = LEAST(analytics_link.first_seen_at, EXCLUDED.first_seen_at),
          last_seen_at = GREATEST(analytics_link.last_seen_at, EXCLUDED.last_seen_at)
    `;

    const inserted = await transaction<{ event_id: string }[]>`
      INSERT INTO access_event (
        event_id,
        source_id,
        analytics_id,
        occurred_at,
        route_path,
        link_type,
        provider,
        request_class,
        outcome,
        status_code,
        is_bot,
        is_preview,
        device_type,
        country_code,
        referrer_domain,
        latency_ms
      )
      VALUES (
        ${event.eventId},
        ${event.sourceId},
        ${event.analyticsId},
        ${event.occurredAt},
        ${event.path},
        ${event.linkType},
        ${event.provider},
        ${event.requestClass},
        ${event.outcome},
        ${event.statusCode},
        ${event.isBot},
        ${event.isPreview},
        ${event.deviceType},
        ${event.countryCode ?? null},
        ${event.referrerDomain ?? null},
        ${event.latencyMs}
      )
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    `;

    if (inserted.length === 0) {
      return false;
    }

    await transaction`
      INSERT INTO link_stats_hourly (
        bucket_start,
        source_id,
        analytics_id,
        requests,
        human_requests,
        preview_requests,
        bot_requests,
        asset_requests,
        unknown_requests,
        error_requests,
        latency_ms_sum
      )
      VALUES (
        ${bucketHour},
        ${event.sourceId},
        ${event.analyticsId},
        1,
        ${humanRequests},
        ${previewRequests},
        ${botRequests},
        ${assetRequests},
        ${unknownRequests},
        ${errorRequests},
        ${event.latencyMs}
      )
      ON CONFLICT (bucket_start, source_id, analytics_id) DO UPDATE
      SET requests = link_stats_hourly.requests + EXCLUDED.requests,
          human_requests = link_stats_hourly.human_requests + EXCLUDED.human_requests,
          preview_requests = link_stats_hourly.preview_requests + EXCLUDED.preview_requests,
          bot_requests = link_stats_hourly.bot_requests + EXCLUDED.bot_requests,
          asset_requests = link_stats_hourly.asset_requests + EXCLUDED.asset_requests,
          unknown_requests = link_stats_hourly.unknown_requests + EXCLUDED.unknown_requests,
          error_requests = link_stats_hourly.error_requests + EXCLUDED.error_requests,
          latency_ms_sum = link_stats_hourly.latency_ms_sum + EXCLUDED.latency_ms_sum,
          updated_at = NOW()
    `;

    await transaction`
      INSERT INTO link_stats_daily_country (
        bucket_day,
        source_id,
        analytics_id,
        country_code,
        requests,
        human_requests,
        preview_requests,
        bot_requests,
        error_requests
      )
      VALUES (
        ${bucketDay},
        ${event.sourceId},
        ${event.analyticsId},
        ${event.countryCode ?? "unknown"},
        1,
        ${humanRequests},
        ${previewRequests},
        ${botRequests},
        ${errorRequests}
      )
      ON CONFLICT (bucket_day, source_id, analytics_id, country_code) DO UPDATE
      SET requests = link_stats_daily_country.requests + EXCLUDED.requests,
          human_requests = link_stats_daily_country.human_requests + EXCLUDED.human_requests,
          preview_requests = link_stats_daily_country.preview_requests + EXCLUDED.preview_requests,
          bot_requests = link_stats_daily_country.bot_requests + EXCLUDED.bot_requests,
          error_requests = link_stats_daily_country.error_requests + EXCLUDED.error_requests
    `;

    await transaction`
      INSERT INTO link_stats_daily_referrer (
        bucket_day,
        source_id,
        analytics_id,
        referrer_domain,
        requests,
        human_requests,
        preview_requests,
        bot_requests,
        error_requests
      )
      VALUES (
        ${bucketDay},
        ${event.sourceId},
        ${event.analyticsId},
        ${event.referrerDomain ?? "direct"},
        1,
        ${humanRequests},
        ${previewRequests},
        ${botRequests},
        ${errorRequests}
      )
      ON CONFLICT (bucket_day, source_id, analytics_id, referrer_domain) DO UPDATE
      SET requests = link_stats_daily_referrer.requests + EXCLUDED.requests,
          human_requests = link_stats_daily_referrer.human_requests + EXCLUDED.human_requests,
          preview_requests = link_stats_daily_referrer.preview_requests + EXCLUDED.preview_requests,
          bot_requests = link_stats_daily_referrer.bot_requests + EXCLUDED.bot_requests,
          error_requests = link_stats_daily_referrer.error_requests + EXCLUDED.error_requests
    `;

    await transaction`
      INSERT INTO link_stats_daily_device (
        bucket_day,
        source_id,
        analytics_id,
        device_type,
        requests,
        human_requests,
        preview_requests,
        bot_requests,
        error_requests
      )
      VALUES (
        ${bucketDay},
        ${event.sourceId},
        ${event.analyticsId},
        ${event.deviceType},
        1,
        ${humanRequests},
        ${previewRequests},
        ${botRequests},
        ${errorRequests}
      )
      ON CONFLICT (bucket_day, source_id, analytics_id, device_type) DO UPDATE
      SET requests = link_stats_daily_device.requests + EXCLUDED.requests,
          human_requests = link_stats_daily_device.human_requests + EXCLUDED.human_requests,
          preview_requests = link_stats_daily_device.preview_requests + EXCLUDED.preview_requests,
          bot_requests = link_stats_daily_device.bot_requests + EXCLUDED.bot_requests,
          error_requests = link_stats_daily_device.error_requests + EXCLUDED.error_requests
    `;

    await transaction`
      INSERT INTO link_stats_daily_provider (
        bucket_day,
        source_id,
        analytics_id,
        provider,
        requests,
        human_requests,
        preview_requests,
        bot_requests,
        error_requests
      )
      VALUES (
        ${bucketDay},
        ${event.sourceId},
        ${event.analyticsId},
        ${event.provider},
        1,
        ${humanRequests},
        ${previewRequests},
        ${botRequests},
        ${errorRequests}
      )
      ON CONFLICT (bucket_day, source_id, analytics_id, provider) DO UPDATE
      SET requests = link_stats_daily_provider.requests + EXCLUDED.requests,
          human_requests = link_stats_daily_provider.human_requests + EXCLUDED.human_requests,
          preview_requests = link_stats_daily_provider.preview_requests + EXCLUDED.preview_requests,
          bot_requests = link_stats_daily_provider.bot_requests + EXCLUDED.bot_requests,
          error_requests = link_stats_daily_provider.error_requests + EXCLUDED.error_requests
    `;

    return true;
  });

  return { isDuplicate: !isInserted };
}
