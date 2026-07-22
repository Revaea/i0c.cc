CREATE OR REPLACE FUNCTION analytics_rebuild_aggregates(
  rebuild_source_id TEXT,
  rebuild_start TIMESTAMPTZ,
  rebuild_end TIMESTAMPTZ,
  rebuild_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  access_events_replayed BIGINT,
  runtime_events_replayed BIGINT,
  aggregate_rows_deleted BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows BIGINT := 0;
  event_row access_event%ROWTYPE;
  runtime_row runtime_event%ROWTYPE;
BEGIN
  IF rebuild_source_id IS NULL OR BTRIM(rebuild_source_id) = '' THEN
    RAISE EXCEPTION 'source_id must not be empty';
  END IF;

  IF rebuild_start IS NULL OR rebuild_end IS NULL OR rebuild_start >= rebuild_end THEN
    RAISE EXCEPTION 'rebuild_start must be earlier than rebuild_end';
  END IF;

  IF NOT rebuild_dry_run THEN
    LOCK TABLE access_event, runtime_event IN SHARE ROW EXCLUSIVE MODE;
  END IF;

  SELECT COUNT(*)
  INTO access_events_replayed
  FROM access_event
  WHERE source_id = rebuild_source_id
    AND occurred_at >= rebuild_start
    AND occurred_at < rebuild_end;

  SELECT COUNT(*)
  INTO runtime_events_replayed
  FROM runtime_event
  WHERE source_id = rebuild_source_id
    AND occurred_at >= rebuild_start
    AND occurred_at < rebuild_end;

  aggregate_rows_deleted := 0;
  IF rebuild_dry_run THEN
    RETURN NEXT;
    RETURN;
  END IF;

  DELETE FROM link_stats_hourly_domain
  WHERE source_id = rebuild_source_id
    AND bucket_start >= rebuild_start
    AND bucket_start < rebuild_end;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  DELETE FROM link_stats_daily_country_domain
  WHERE source_id = rebuild_source_id
    AND bucket_day >= (rebuild_start AT TIME ZONE 'UTC')::DATE
    AND bucket_day < (rebuild_end AT TIME ZONE 'UTC')::DATE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  DELETE FROM link_stats_daily_referrer_domain
  WHERE source_id = rebuild_source_id
    AND bucket_day >= (rebuild_start AT TIME ZONE 'UTC')::DATE
    AND bucket_day < (rebuild_end AT TIME ZONE 'UTC')::DATE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  DELETE FROM link_stats_daily_device_domain
  WHERE source_id = rebuild_source_id
    AND bucket_day >= (rebuild_start AT TIME ZONE 'UTC')::DATE
    AND bucket_day < (rebuild_end AT TIME ZONE 'UTC')::DATE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  DELETE FROM link_stats_daily_provider_domain
  WHERE source_id = rebuild_source_id
    AND bucket_day >= (rebuild_start AT TIME ZONE 'UTC')::DATE
    AND bucket_day < (rebuild_end AT TIME ZONE 'UTC')::DATE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  DELETE FROM link_stats_daily_campaign_domain
  WHERE source_id = rebuild_source_id
    AND bucket_day >= (rebuild_start AT TIME ZONE 'UTC')::DATE
    AND bucket_day < (rebuild_end AT TIME ZONE 'UTC')::DATE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  DELETE FROM link_stats_daily_upstream_domain
  WHERE source_id = rebuild_source_id
    AND bucket_day >= (rebuild_start AT TIME ZONE 'UTC')::DATE
    AND bucket_day < (rebuild_end AT TIME ZONE 'UTC')::DATE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  DELETE FROM runtime_stats_hourly
  WHERE source_id = rebuild_source_id
    AND bucket_start >= rebuild_start
    AND bucket_start < rebuild_end;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  DELETE FROM runtime_stats_daily_bot
  WHERE source_id = rebuild_source_id
    AND bucket_day >= (rebuild_start AT TIME ZONE 'UTC')::DATE
    AND bucket_day < (rebuild_end AT TIME ZONE 'UTC')::DATE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  DELETE FROM link_stats_daily_bot
  WHERE source_id = rebuild_source_id
    AND bucket_day >= (rebuild_start AT TIME ZONE 'UTC')::DATE
    AND bucket_day < (rebuild_end AT TIME ZONE 'UTC')::DATE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  aggregate_rows_deleted := aggregate_rows_deleted + affected_rows;

  FOR event_row IN
    SELECT *
    FROM access_event
    WHERE source_id = rebuild_source_id
      AND occurred_at >= rebuild_start
      AND occurred_at < rebuild_end
    ORDER BY occurred_at, event_id
  LOOP
    PERFORM analytics_rollup_link_domain(event_row);
    PERFORM analytics_rollup_runtime_traffic(
      event_row.occurred_at,
      event_row.source_id,
      event_row.entry_domain,
      event_row.provider,
      event_row.resource_class,
      event_row.match_kind,
      'matched',
      event_row.traffic_class,
      event_row.bot_category,
      event_row.bot_confidence,
      event_row.classifier_version,
      event_row.probe_category,
      event_row.is_entry,
      event_row.status_code,
      event_row.sample_rate,
      event_row.latency_ms,
      event_row.analytics_id
    );
  END LOOP;

  FOR runtime_row IN
    SELECT *
    FROM runtime_event
    WHERE source_id = rebuild_source_id
      AND occurred_at >= rebuild_start
      AND occurred_at < rebuild_end
    ORDER BY occurred_at, event_id
  LOOP
    PERFORM analytics_rollup_runtime_traffic(
      runtime_row.occurred_at,
      runtime_row.source_id,
      runtime_row.entry_domain,
      runtime_row.provider,
      runtime_row.resource_class,
      runtime_row.match_kind,
      runtime_row.match_outcome,
      runtime_row.traffic_class,
      runtime_row.bot_category,
      runtime_row.bot_confidence,
      runtime_row.classifier_version,
      runtime_row.probe_category,
      TRUE,
      runtime_row.status_code,
      runtime_row.sample_rate,
      runtime_row.latency_ms,
      NULL
    );
  END LOOP;

  RETURN NEXT;
END;
$$;
