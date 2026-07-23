CREATE TABLE analytics_event_receipt (
  event_id UUID PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES analytics_source(source_id),
  event_kind TEXT NOT NULL CHECK (event_kind IN ('link', 'runtime')),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO analytics_event_receipt (event_id, source_id, event_kind, received_at)
SELECT event_id, source_id, 'link', received_at
FROM access_event
ON CONFLICT (event_id) DO NOTHING;

CREATE INDEX analytics_event_receipt_source_received_idx
  ON analytics_event_receipt (source_id, received_at DESC);

CREATE OR REPLACE FUNCTION analytics_claim_event_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  claimed_source_id TEXT;
  claimed_event_kind TEXT;
BEGIN
  INSERT INTO analytics_event_receipt (event_id, source_id, event_kind)
  VALUES (NEW.event_id, NEW.source_id, TG_ARGV[0])
  ON CONFLICT (event_id) DO NOTHING;

  SELECT source_id, event_kind
  INTO claimed_source_id, claimed_event_kind
  FROM analytics_event_receipt
  WHERE event_id = NEW.event_id;

  IF claimed_source_id <> NEW.source_id OR claimed_event_kind <> TG_ARGV[0] THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER access_event_receipt_before_insert
BEFORE INSERT ON access_event
FOR EACH ROW
EXECUTE FUNCTION analytics_claim_event_receipt('link');

CREATE TABLE runtime_event (
  event_id UUID PRIMARY KEY,
  schema_version SMALLINT NOT NULL CHECK (schema_version = 2),
  source_id TEXT NOT NULL REFERENCES analytics_source(source_id),
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entry_domain TEXT NOT NULL CHECK (
    entry_domain = 'unknown'
    OR (
      CHAR_LENGTH(entry_domain) BETWEEN 1 AND 253
      AND entry_domain = LOWER(entry_domain)
      AND entry_domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'
    )
  ),
  provider TEXT NOT NULL CHECK (
    provider IN ('cloudflare', 'vercel', 'netlify', 'unknown')
  ),
  status_code INTEGER NOT NULL CHECK (status_code BETWEEN 100 AND 599),
  resource_class TEXT NOT NULL CHECK (
    resource_class IN ('document', 'asset', 'api', 'other', 'unknown')
  ),
  match_kind TEXT NOT NULL CHECK (match_kind IN ('unmatched', 'system')),
  match_outcome TEXT NOT NULL CHECK (
    match_outcome IN (
      'not_found',
      'proxy_exhausted',
      'config_unavailable',
      'internal_error'
    )
  ),
  traffic_class TEXT NOT NULL CHECK (
    traffic_class IN ('browser_like', 'declared_bot', 'suspected_automation', 'unknown')
  ),
  bot_category TEXT NOT NULL CHECK (
    bot_category IN (
      'none',
      'search',
      'ai_crawler',
      'social_preview',
      'monitor',
      'automation',
      'security_probe',
      'unknown'
    )
  ),
  bot_confidence TEXT NOT NULL CHECK (
    bot_confidence IN ('none', 'low', 'medium', 'high')
  ),
  classifier_version SMALLINT NOT NULL CHECK (classifier_version > 0),
  device_type TEXT NOT NULL CHECK (
    device_type IN ('desktop', 'mobile', 'tablet', 'bot', 'unknown')
  ),
  country_code TEXT CHECK (country_code ~ '^[A-Z]{2}$'),
  probe_category TEXT NOT NULL CHECK (
    probe_category IN (
      'none',
      'wordpress',
      'env_file',
      'admin',
      'vcs',
      'path_traversal',
      'scanner',
      'other'
    )
  ),
  sample_rate DOUBLE PRECISION NOT NULL CHECK (
    sample_rate > 0 AND sample_rate <= 1
  ),
  latency_ms INTEGER NOT NULL CHECK (latency_ms BETWEEN 0 AND 3600000),
  CHECK (
    (device_type = 'bot')
    = (traffic_class IN ('declared_bot', 'suspected_automation'))
  ),
  CHECK (
    (bot_category = 'none')
    = (traffic_class NOT IN ('declared_bot', 'suspected_automation'))
  ),
  CHECK (
    (bot_confidence = 'none')
    = (traffic_class NOT IN ('declared_bot', 'suspected_automation'))
  )
);

CREATE INDEX runtime_event_source_time_idx
  ON runtime_event (source_id, occurred_at DESC);

CREATE INDEX runtime_event_source_domain_time_idx
  ON runtime_event (source_id, entry_domain, occurred_at DESC);

CREATE TRIGGER runtime_event_receipt_before_insert
BEFORE INSERT ON runtime_event
FOR EACH ROW
EXECUTE FUNCTION analytics_claim_event_receipt('runtime');

CREATE TABLE runtime_stats_hourly (
  bucket_start TIMESTAMPTZ NOT NULL,
  source_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  provider TEXT NOT NULL,
  resource_class TEXT NOT NULL,
  match_kind TEXT NOT NULL,
  match_outcome TEXT NOT NULL,
  observed_requests BIGINT NOT NULL DEFAULT 0,
  estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  entry_observed_requests BIGINT NOT NULL DEFAULT 0,
  entry_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  continuation_observed_requests BIGINT NOT NULL DEFAULT 0,
  continuation_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  human_observed_requests BIGINT NOT NULL DEFAULT 0,
  human_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  entry_human_observed_requests BIGINT NOT NULL DEFAULT 0,
  entry_human_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  declared_bot_observed_requests BIGINT NOT NULL DEFAULT 0,
  declared_bot_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  suspected_automation_observed_requests BIGINT NOT NULL DEFAULT 0,
  suspected_automation_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  unknown_traffic_observed_requests BIGINT NOT NULL DEFAULT 0,
  unknown_traffic_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  error_observed_requests BIGINT NOT NULL DEFAULT 0,
  error_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  latency_ms_observed_sum BIGINT NOT NULL DEFAULT 0,
  latency_ms_estimated_sum DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (
    bucket_start,
    source_id,
    entry_domain,
    provider,
    resource_class,
    match_kind,
    match_outcome
  ),
  FOREIGN KEY (source_id) REFERENCES analytics_source(source_id)
);

CREATE INDEX runtime_stats_hourly_source_domain_time_idx
  ON runtime_stats_hourly (source_id, entry_domain, bucket_start DESC);

CREATE TABLE runtime_stats_daily_bot (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  provider TEXT NOT NULL,
  traffic_class TEXT NOT NULL,
  bot_category TEXT NOT NULL,
  bot_confidence TEXT NOT NULL,
  classifier_version SMALLINT NOT NULL,
  resource_class TEXT NOT NULL,
  match_kind TEXT NOT NULL,
  match_outcome TEXT NOT NULL,
  probe_category TEXT NOT NULL,
  observed_requests BIGINT NOT NULL DEFAULT 0,
  estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  entry_observed_requests BIGINT NOT NULL DEFAULT 0,
  entry_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  error_observed_requests BIGINT NOT NULL DEFAULT 0,
  error_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (
    bucket_day,
    source_id,
    entry_domain,
    provider,
    traffic_class,
    bot_category,
    bot_confidence,
    classifier_version,
    resource_class,
    match_kind,
    match_outcome,
    probe_category
  ),
  FOREIGN KEY (source_id) REFERENCES analytics_source(source_id)
);

CREATE INDEX runtime_stats_daily_bot_source_domain_day_idx
  ON runtime_stats_daily_bot (source_id, entry_domain, bucket_day DESC);

CREATE TABLE link_stats_daily_bot (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  provider TEXT NOT NULL,
  traffic_class TEXT NOT NULL,
  bot_category TEXT NOT NULL,
  bot_confidence TEXT NOT NULL,
  classifier_version SMALLINT NOT NULL,
  resource_class TEXT NOT NULL,
  match_kind TEXT NOT NULL,
  probe_category TEXT NOT NULL,
  observed_requests BIGINT NOT NULL DEFAULT 0,
  estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  entry_observed_requests BIGINT NOT NULL DEFAULT 0,
  entry_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  error_observed_requests BIGINT NOT NULL DEFAULT 0,
  error_estimated_requests DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (
    bucket_day,
    source_id,
    analytics_id,
    entry_domain,
    provider,
    traffic_class,
    bot_category,
    bot_confidence,
    classifier_version,
    resource_class,
    match_kind,
    probe_category
  ),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX link_stats_daily_bot_source_domain_day_idx
  ON link_stats_daily_bot (source_id, entry_domain, bucket_day DESC);

CREATE INDEX link_stats_daily_bot_link_domain_day_idx
  ON link_stats_daily_bot (
    source_id,
    analytics_id,
    entry_domain,
    bucket_day DESC
  );

CREATE OR REPLACE FUNCTION analytics_rollup_runtime_traffic(
  event_occurred_at TIMESTAMPTZ,
  event_source_id TEXT,
  event_entry_domain TEXT,
  event_provider TEXT,
  event_resource_class TEXT,
  event_match_kind TEXT,
  event_match_outcome TEXT,
  event_traffic_class TEXT,
  event_bot_category TEXT,
  event_bot_confidence TEXT,
  event_classifier_version SMALLINT,
  event_probe_category TEXT,
  event_is_entry BOOLEAN,
  event_status_code INTEGER,
  event_sample_rate DOUBLE PRECISION,
  event_latency_ms INTEGER,
  event_analytics_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  bucket_hour TIMESTAMPTZ := DATE_TRUNC(
    'hour',
    event_occurred_at AT TIME ZONE 'UTC'
  ) AT TIME ZONE 'UTC';
  bucket_date DATE := (event_occurred_at AT TIME ZONE 'UTC')::DATE;
  estimated_weight DOUBLE PRECISION := 1 / event_sample_rate;
  entry_observed BIGINT := CASE WHEN event_is_entry THEN 1 ELSE 0 END;
  entry_estimated DOUBLE PRECISION := CASE WHEN event_is_entry THEN estimated_weight ELSE 0 END;
  continuation_observed BIGINT := CASE WHEN event_is_entry THEN 0 ELSE 1 END;
  continuation_estimated DOUBLE PRECISION := CASE WHEN event_is_entry THEN 0 ELSE estimated_weight END;
  human_observed BIGINT := CASE WHEN event_traffic_class = 'browser_like' THEN 1 ELSE 0 END;
  human_estimated DOUBLE PRECISION := CASE
    WHEN event_traffic_class = 'browser_like' THEN estimated_weight
    ELSE 0
  END;
  entry_human_observed BIGINT := CASE
    WHEN event_is_entry AND event_traffic_class = 'browser_like' THEN 1
    ELSE 0
  END;
  entry_human_estimated DOUBLE PRECISION := CASE
    WHEN event_is_entry AND event_traffic_class = 'browser_like' THEN estimated_weight
    ELSE 0
  END;
  error_observed BIGINT := CASE WHEN event_status_code >= 400 THEN 1 ELSE 0 END;
  error_estimated DOUBLE PRECISION := CASE
    WHEN event_status_code >= 400 THEN estimated_weight
    ELSE 0
  END;
BEGIN
  INSERT INTO runtime_stats_hourly (
    bucket_start,
    source_id,
    entry_domain,
    provider,
    resource_class,
    match_kind,
    match_outcome,
    observed_requests,
    estimated_requests,
    entry_observed_requests,
    entry_estimated_requests,
    continuation_observed_requests,
    continuation_estimated_requests,
    human_observed_requests,
    human_estimated_requests,
    entry_human_observed_requests,
    entry_human_estimated_requests,
    declared_bot_observed_requests,
    declared_bot_estimated_requests,
    suspected_automation_observed_requests,
    suspected_automation_estimated_requests,
    unknown_traffic_observed_requests,
    unknown_traffic_estimated_requests,
    error_observed_requests,
    error_estimated_requests,
    latency_ms_observed_sum,
    latency_ms_estimated_sum
  )
  VALUES (
    bucket_hour,
    event_source_id,
    event_entry_domain,
    event_provider,
    event_resource_class,
    event_match_kind,
    event_match_outcome,
    1,
    estimated_weight,
    entry_observed,
    entry_estimated,
    continuation_observed,
    continuation_estimated,
    human_observed,
    human_estimated,
    entry_human_observed,
    entry_human_estimated,
    CASE WHEN event_traffic_class = 'declared_bot' THEN 1 ELSE 0 END,
    CASE WHEN event_traffic_class = 'declared_bot' THEN estimated_weight ELSE 0 END,
    CASE WHEN event_traffic_class = 'suspected_automation' THEN 1 ELSE 0 END,
    CASE WHEN event_traffic_class = 'suspected_automation' THEN estimated_weight ELSE 0 END,
    CASE WHEN event_traffic_class = 'unknown' THEN 1 ELSE 0 END,
    CASE WHEN event_traffic_class = 'unknown' THEN estimated_weight ELSE 0 END,
    error_observed,
    error_estimated,
    event_latency_ms,
    event_latency_ms * estimated_weight
  )
  ON CONFLICT (
    bucket_start,
    source_id,
    entry_domain,
    provider,
    resource_class,
    match_kind,
    match_outcome
  ) DO UPDATE
  SET observed_requests = runtime_stats_hourly.observed_requests + EXCLUDED.observed_requests,
      estimated_requests = runtime_stats_hourly.estimated_requests + EXCLUDED.estimated_requests,
      entry_observed_requests = runtime_stats_hourly.entry_observed_requests + EXCLUDED.entry_observed_requests,
      entry_estimated_requests = runtime_stats_hourly.entry_estimated_requests + EXCLUDED.entry_estimated_requests,
      continuation_observed_requests = runtime_stats_hourly.continuation_observed_requests + EXCLUDED.continuation_observed_requests,
      continuation_estimated_requests = runtime_stats_hourly.continuation_estimated_requests + EXCLUDED.continuation_estimated_requests,
      human_observed_requests = runtime_stats_hourly.human_observed_requests + EXCLUDED.human_observed_requests,
      human_estimated_requests = runtime_stats_hourly.human_estimated_requests + EXCLUDED.human_estimated_requests,
      entry_human_observed_requests = runtime_stats_hourly.entry_human_observed_requests + EXCLUDED.entry_human_observed_requests,
      entry_human_estimated_requests = runtime_stats_hourly.entry_human_estimated_requests + EXCLUDED.entry_human_estimated_requests,
      declared_bot_observed_requests = runtime_stats_hourly.declared_bot_observed_requests + EXCLUDED.declared_bot_observed_requests,
      declared_bot_estimated_requests = runtime_stats_hourly.declared_bot_estimated_requests + EXCLUDED.declared_bot_estimated_requests,
      suspected_automation_observed_requests = runtime_stats_hourly.suspected_automation_observed_requests + EXCLUDED.suspected_automation_observed_requests,
      suspected_automation_estimated_requests = runtime_stats_hourly.suspected_automation_estimated_requests + EXCLUDED.suspected_automation_estimated_requests,
      unknown_traffic_observed_requests = runtime_stats_hourly.unknown_traffic_observed_requests + EXCLUDED.unknown_traffic_observed_requests,
      unknown_traffic_estimated_requests = runtime_stats_hourly.unknown_traffic_estimated_requests + EXCLUDED.unknown_traffic_estimated_requests,
      error_observed_requests = runtime_stats_hourly.error_observed_requests + EXCLUDED.error_observed_requests,
      error_estimated_requests = runtime_stats_hourly.error_estimated_requests + EXCLUDED.error_estimated_requests,
      latency_ms_observed_sum = runtime_stats_hourly.latency_ms_observed_sum + EXCLUDED.latency_ms_observed_sum,
      latency_ms_estimated_sum = runtime_stats_hourly.latency_ms_estimated_sum + EXCLUDED.latency_ms_estimated_sum,
      updated_at = NOW();

  INSERT INTO runtime_stats_daily_bot (
    bucket_day,
    source_id,
    entry_domain,
    provider,
    traffic_class,
    bot_category,
    bot_confidence,
    classifier_version,
    resource_class,
    match_kind,
    match_outcome,
    probe_category,
    observed_requests,
    estimated_requests,
    entry_observed_requests,
    entry_estimated_requests,
    error_observed_requests,
    error_estimated_requests
  )
  VALUES (
    bucket_date,
    event_source_id,
    event_entry_domain,
    event_provider,
    event_traffic_class,
    event_bot_category,
    event_bot_confidence,
    event_classifier_version,
    event_resource_class,
    event_match_kind,
    event_match_outcome,
    event_probe_category,
    1,
    estimated_weight,
    entry_observed,
    entry_estimated,
    error_observed,
    error_estimated
  )
  ON CONFLICT (
    bucket_day,
    source_id,
    entry_domain,
    provider,
    traffic_class,
    bot_category,
    bot_confidence,
    classifier_version,
    resource_class,
    match_kind,
    match_outcome,
    probe_category
  ) DO UPDATE
  SET observed_requests = runtime_stats_daily_bot.observed_requests + EXCLUDED.observed_requests,
      estimated_requests = runtime_stats_daily_bot.estimated_requests + EXCLUDED.estimated_requests,
      entry_observed_requests = runtime_stats_daily_bot.entry_observed_requests + EXCLUDED.entry_observed_requests,
      entry_estimated_requests = runtime_stats_daily_bot.entry_estimated_requests + EXCLUDED.entry_estimated_requests,
      error_observed_requests = runtime_stats_daily_bot.error_observed_requests + EXCLUDED.error_observed_requests,
      error_estimated_requests = runtime_stats_daily_bot.error_estimated_requests + EXCLUDED.error_estimated_requests;

  IF event_analytics_id IS NOT NULL THEN
    INSERT INTO link_stats_daily_bot (
      bucket_day,
      source_id,
      analytics_id,
      entry_domain,
      provider,
      traffic_class,
      bot_category,
      bot_confidence,
      classifier_version,
      resource_class,
      match_kind,
      probe_category,
      observed_requests,
      estimated_requests,
      entry_observed_requests,
      entry_estimated_requests,
      error_observed_requests,
      error_estimated_requests
    )
    VALUES (
      bucket_date,
      event_source_id,
      event_analytics_id,
      event_entry_domain,
      event_provider,
      event_traffic_class,
      event_bot_category,
      event_bot_confidence,
      event_classifier_version,
      event_resource_class,
      event_match_kind,
      event_probe_category,
      1,
      estimated_weight,
      entry_observed,
      entry_estimated,
      error_observed,
      error_estimated
    )
    ON CONFLICT (
      bucket_day,
      source_id,
      analytics_id,
      entry_domain,
      provider,
      traffic_class,
      bot_category,
      bot_confidence,
      classifier_version,
      resource_class,
      match_kind,
      probe_category
    ) DO UPDATE
    SET observed_requests = link_stats_daily_bot.observed_requests + EXCLUDED.observed_requests,
        estimated_requests = link_stats_daily_bot.estimated_requests + EXCLUDED.estimated_requests,
        entry_observed_requests = link_stats_daily_bot.entry_observed_requests + EXCLUDED.entry_observed_requests,
        entry_estimated_requests = link_stats_daily_bot.entry_estimated_requests + EXCLUDED.entry_estimated_requests,
        error_observed_requests = link_stats_daily_bot.error_observed_requests + EXCLUDED.error_observed_requests,
        error_estimated_requests = link_stats_daily_bot.error_estimated_requests + EXCLUDED.error_estimated_requests;
  END IF;
END;
$$;

SELECT analytics_rollup_runtime_traffic(
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
)
FROM access_event AS event_row;

CREATE OR REPLACE FUNCTION analytics_rollup_access_runtime_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM analytics_rollup_runtime_traffic(
    NEW.occurred_at,
    NEW.source_id,
    NEW.entry_domain,
    NEW.provider,
    NEW.resource_class,
    NEW.match_kind,
    'matched',
    NEW.traffic_class,
    NEW.bot_category,
    NEW.bot_confidence,
    NEW.classifier_version,
    NEW.probe_category,
    NEW.is_entry,
    NEW.status_code,
    NEW.sample_rate,
    NEW.latency_ms,
    NEW.analytics_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER access_event_rollup_runtime_after_insert
AFTER INSERT ON access_event
FOR EACH ROW
EXECUTE FUNCTION analytics_rollup_access_runtime_after_insert();

CREATE OR REPLACE FUNCTION analytics_rollup_runtime_event_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM analytics_rollup_runtime_traffic(
    NEW.occurred_at,
    NEW.source_id,
    NEW.entry_domain,
    NEW.provider,
    NEW.resource_class,
    NEW.match_kind,
    NEW.match_outcome,
    NEW.traffic_class,
    NEW.bot_category,
    NEW.bot_confidence,
    NEW.classifier_version,
    NEW.probe_category,
    TRUE,
    NEW.status_code,
    NEW.sample_rate,
    NEW.latency_ms,
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER runtime_event_rollup_after_insert
AFTER INSERT ON runtime_event
FOR EACH ROW
EXECUTE FUNCTION analytics_rollup_runtime_event_after_insert();
