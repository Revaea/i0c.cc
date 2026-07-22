ALTER TABLE access_event
  ADD COLUMN schema_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN entry_domain TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN campaign_id TEXT,
  ADD COLUMN upstream_event_id UUID,
  ADD COLUMN upstream_analytics_id TEXT,
  ADD COLUMN upstream_entry_domain TEXT,
  ADD COLUMN upstream_provider TEXT,
  ADD COLUMN is_entry BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN resource_class TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN match_kind TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN traffic_class TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN bot_category TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN bot_confidence TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN classifier_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN sample_rate DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN probe_category TEXT NOT NULL DEFAULT 'none';

ALTER TABLE access_event
  ADD CONSTRAINT access_event_schema_version_check
    CHECK (schema_version IN (1, 2)),
  ADD CONSTRAINT access_event_entry_domain_check
    CHECK (
      entry_domain = 'unknown'
      OR (
        CHAR_LENGTH(entry_domain) BETWEEN 1 AND 253
        AND entry_domain = LOWER(entry_domain)
        AND entry_domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'
      )
    ),
  ADD CONSTRAINT access_event_campaign_id_check
    CHECK (
      campaign_id IS NULL
      OR (
        CHAR_LENGTH(campaign_id) BETWEEN 1 AND 128
        AND campaign_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
      )
    ),
  ADD CONSTRAINT access_event_upstream_tuple_check
    CHECK (
      (
        upstream_event_id IS NULL
        AND upstream_analytics_id IS NULL
        AND upstream_entry_domain IS NULL
        AND upstream_provider IS NULL
      )
      OR (
        upstream_event_id IS NOT NULL
        AND upstream_analytics_id IS NOT NULL
        AND upstream_entry_domain IS NOT NULL
        AND upstream_provider IS NOT NULL
      )
    ),
  ADD CONSTRAINT access_event_upstream_analytics_id_check
    CHECK (
      upstream_analytics_id IS NULL
      OR (
        CHAR_LENGTH(upstream_analytics_id) BETWEEN 1 AND 128
        AND upstream_analytics_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
      )
    ),
  ADD CONSTRAINT access_event_upstream_entry_domain_check
    CHECK (
      upstream_entry_domain IS NULL
      OR upstream_entry_domain = 'unknown'
      OR (
        CHAR_LENGTH(upstream_entry_domain) BETWEEN 1 AND 253
        AND upstream_entry_domain = LOWER(upstream_entry_domain)
        AND upstream_entry_domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'
      )
    ),
  ADD CONSTRAINT access_event_upstream_provider_check
    CHECK (
      upstream_provider IS NULL
      OR upstream_provider IN ('cloudflare', 'vercel', 'netlify', 'unknown')
    ),
  ADD CONSTRAINT access_event_is_entry_check
    CHECK (
      is_entry
      OR (
        upstream_event_id IS NOT NULL
        AND upstream_analytics_id IS NOT NULL
        AND upstream_entry_domain IS NOT NULL
        AND upstream_provider IS NOT NULL
      )
    ),
  ADD CONSTRAINT access_event_resource_class_check
    CHECK (resource_class IN ('document', 'asset', 'api', 'other', 'unknown')),
  ADD CONSTRAINT access_event_match_kind_check
    CHECK (match_kind IN ('exact', 'parameterized', 'prefix', 'catch_all', 'unknown')),
  ADD CONSTRAINT access_event_traffic_class_check
    CHECK (traffic_class IN ('browser_like', 'declared_bot', 'suspected_automation', 'unknown')),
  ADD CONSTRAINT access_event_bot_category_check
    CHECK (
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
  ADD CONSTRAINT access_event_bot_confidence_check
    CHECK (bot_confidence IN ('none', 'low', 'medium', 'high')),
  ADD CONSTRAINT access_event_classifier_version_check
    CHECK (classifier_version > 0),
  ADD CONSTRAINT access_event_sample_rate_check
    CHECK (sample_rate = 1),
  ADD CONSTRAINT access_event_probe_category_check
    CHECK (
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
    );

CREATE INDEX access_event_source_domain_time_idx
  ON access_event (source_id, entry_domain, occurred_at DESC);

CREATE INDEX access_event_source_campaign_time_idx
  ON access_event (source_id, campaign_id, occurred_at DESC)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX access_event_source_upstream_time_idx
  ON access_event (source_id, upstream_event_id, occurred_at DESC)
  WHERE upstream_event_id IS NOT NULL;

CREATE TABLE analytics_upstream_claim (
  source_id TEXT NOT NULL REFERENCES analytics_source(source_id),
  upstream_event_id UUID NOT NULL,
  downstream_event_id UUID NOT NULL,
  upstream_analytics_id TEXT NOT NULL CHECK (
    CHAR_LENGTH(upstream_analytics_id) BETWEEN 1 AND 128
    AND upstream_analytics_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  upstream_entry_domain TEXT NOT NULL CHECK (
    upstream_entry_domain = 'unknown'
    OR (
      CHAR_LENGTH(upstream_entry_domain) BETWEEN 1 AND 253
      AND upstream_entry_domain = LOWER(upstream_entry_domain)
      AND upstream_entry_domain ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'
    )
  ),
  upstream_provider TEXT NOT NULL CHECK (
    upstream_provider IN ('cloudflare', 'vercel', 'netlify', 'unknown')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_id, upstream_event_id),
  UNIQUE (source_id, downstream_event_id)
);

CREATE INDEX analytics_upstream_claim_source_created_idx
  ON analytics_upstream_claim (source_id, created_at DESC);

CREATE TABLE link_stats_hourly_domain (
  bucket_start TIMESTAMPTZ NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  requests BIGINT NOT NULL DEFAULT 0,
  entry_requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  entry_human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  suspected_automation_requests BIGINT NOT NULL DEFAULT 0,
  asset_requests BIGINT NOT NULL DEFAULT 0,
  unknown_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  latency_ms_sum BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bucket_start, source_id, analytics_id, entry_domain),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX link_stats_hourly_domain_source_time_idx
  ON link_stats_hourly_domain (source_id, entry_domain, bucket_start DESC);

CREATE INDEX link_stats_hourly_domain_link_time_idx
  ON link_stats_hourly_domain (
    source_id,
    analytics_id,
    entry_domain,
    bucket_start DESC
  );

CREATE TABLE link_stats_daily_country_domain (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  country_code TEXT NOT NULL,
  requests BIGINT NOT NULL DEFAULT 0,
  entry_requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  entry_human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  suspected_automation_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, analytics_id, entry_domain, country_code),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX link_stats_daily_country_domain_source_day_idx
  ON link_stats_daily_country_domain (source_id, entry_domain, bucket_day DESC);

CREATE INDEX link_stats_daily_country_domain_link_day_idx
  ON link_stats_daily_country_domain (
    source_id,
    analytics_id,
    entry_domain,
    bucket_day DESC
  );

CREATE TABLE link_stats_daily_referrer_domain (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  referrer_domain TEXT NOT NULL,
  requests BIGINT NOT NULL DEFAULT 0,
  entry_requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  entry_human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  suspected_automation_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, analytics_id, entry_domain, referrer_domain),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX link_stats_daily_referrer_domain_source_day_idx
  ON link_stats_daily_referrer_domain (source_id, entry_domain, bucket_day DESC);

CREATE INDEX link_stats_daily_referrer_domain_link_day_idx
  ON link_stats_daily_referrer_domain (
    source_id,
    analytics_id,
    entry_domain,
    bucket_day DESC
  );

CREATE TABLE link_stats_daily_device_domain (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  device_type TEXT NOT NULL,
  requests BIGINT NOT NULL DEFAULT 0,
  entry_requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  entry_human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  suspected_automation_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, analytics_id, entry_domain, device_type),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX link_stats_daily_device_domain_source_day_idx
  ON link_stats_daily_device_domain (source_id, entry_domain, bucket_day DESC);

CREATE INDEX link_stats_daily_device_domain_link_day_idx
  ON link_stats_daily_device_domain (
    source_id,
    analytics_id,
    entry_domain,
    bucket_day DESC
  );

CREATE TABLE link_stats_daily_provider_domain (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (
    provider IN ('cloudflare', 'vercel', 'netlify', 'unknown')
  ),
  requests BIGINT NOT NULL DEFAULT 0,
  entry_requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  entry_human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  suspected_automation_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, analytics_id, entry_domain, provider),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX link_stats_daily_provider_domain_source_day_idx
  ON link_stats_daily_provider_domain (source_id, entry_domain, bucket_day DESC);

CREATE INDEX link_stats_daily_provider_domain_link_day_idx
  ON link_stats_daily_provider_domain (
    source_id,
    analytics_id,
    entry_domain,
    bucket_day DESC
  );

CREATE TABLE link_stats_daily_campaign_domain (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  requests BIGINT NOT NULL DEFAULT 0,
  entry_requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  entry_human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  suspected_automation_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, analytics_id, entry_domain, campaign_id),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX link_stats_daily_campaign_domain_source_day_idx
  ON link_stats_daily_campaign_domain (source_id, entry_domain, bucket_day DESC);

CREATE INDEX link_stats_daily_campaign_domain_link_day_idx
  ON link_stats_daily_campaign_domain (
    source_id,
    analytics_id,
    entry_domain,
    bucket_day DESC
  );

CREATE TABLE link_stats_daily_upstream_domain (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  upstream_analytics_id TEXT NOT NULL,
  upstream_entry_domain TEXT NOT NULL,
  upstream_provider TEXT NOT NULL CHECK (
    upstream_provider IN ('cloudflare', 'vercel', 'netlify', 'unknown')
  ),
  requests BIGINT NOT NULL DEFAULT 0,
  entry_requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  entry_human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  suspected_automation_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (
    bucket_day,
    source_id,
    analytics_id,
    entry_domain,
    upstream_analytics_id,
    upstream_entry_domain,
    upstream_provider
  ),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX link_stats_daily_upstream_domain_source_day_idx
  ON link_stats_daily_upstream_domain (source_id, entry_domain, bucket_day DESC);

CREATE INDEX link_stats_daily_upstream_domain_link_day_idx
  ON link_stats_daily_upstream_domain (
    source_id,
    analytics_id,
    entry_domain,
    bucket_day DESC
  );

CREATE OR REPLACE FUNCTION analytics_normalize_v1_access_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.schema_version = 1 THEN
    NEW.entry_domain := 'unknown';
    NEW.campaign_id := NULL;
    NEW.upstream_event_id := NULL;
    NEW.upstream_analytics_id := NULL;
    NEW.upstream_entry_domain := NULL;
    NEW.upstream_provider := NULL;
    NEW.is_entry := TRUE;
    NEW.resource_class := CASE
      WHEN NEW.request_class = 'asset' THEN 'asset'
      WHEN NEW.request_class = 'human' THEN 'document'
      ELSE 'unknown'
    END;
    NEW.match_kind := 'unknown';
    NEW.traffic_class := CASE
      WHEN NEW.request_class = 'human' THEN 'browser_like'
      WHEN NEW.request_class IN ('link_preview', 'crawler', 'monitor') THEN 'declared_bot'
      ELSE 'unknown'
    END;
    NEW.bot_category := CASE
      WHEN NEW.request_class = 'link_preview' THEN 'social_preview'
      WHEN NEW.request_class = 'monitor' THEN 'monitor'
      WHEN NEW.request_class = 'crawler' THEN 'unknown'
      ELSE 'none'
    END;
    NEW.bot_confidence := CASE
      WHEN NEW.request_class IN ('link_preview', 'crawler', 'monitor') THEN 'high'
      ELSE 'none'
    END;
    NEW.classifier_version := 1;
    NEW.sample_rate := 1;
    NEW.probe_category := 'none';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER access_event_normalize_v1_before_insert
BEFORE INSERT ON access_event
FOR EACH ROW
EXECUTE FUNCTION analytics_normalize_v1_access_event();

UPDATE access_event
SET entry_domain = 'unknown',
    campaign_id = NULL,
    upstream_event_id = NULL,
    upstream_analytics_id = NULL,
    upstream_entry_domain = NULL,
    upstream_provider = NULL,
    is_entry = TRUE,
    resource_class = CASE
      WHEN request_class = 'asset' THEN 'asset'
      WHEN request_class = 'human' THEN 'document'
      ELSE 'unknown'
    END,
    match_kind = 'unknown',
    traffic_class = CASE
      WHEN request_class = 'human' THEN 'browser_like'
      WHEN request_class IN ('link_preview', 'crawler', 'monitor') THEN 'declared_bot'
      ELSE 'unknown'
    END,
    bot_category = CASE
      WHEN request_class = 'link_preview' THEN 'social_preview'
      WHEN request_class = 'monitor' THEN 'monitor'
      WHEN request_class = 'crawler' THEN 'unknown'
      ELSE 'none'
    END,
    bot_confidence = CASE
      WHEN request_class IN ('link_preview', 'crawler', 'monitor') THEN 'high'
      ELSE 'none'
    END,
    classifier_version = 1,
    sample_rate = 1,
    probe_category = 'none'
WHERE schema_version = 1;

CREATE OR REPLACE FUNCTION analytics_rollup_link_domain(event_row access_event)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  bucket_hour TIMESTAMPTZ := DATE_TRUNC(
    'hour',
    event_row.occurred_at AT TIME ZONE 'UTC'
  ) AT TIME ZONE 'UTC';
  bucket_date DATE := (event_row.occurred_at AT TIME ZONE 'UTC')::DATE;
  entry_count BIGINT := CASE WHEN event_row.is_entry THEN 1 ELSE 0 END;
  human_count BIGINT := CASE WHEN event_row.request_class = 'human' THEN 1 ELSE 0 END;
  entry_human_count BIGINT := CASE
    WHEN event_row.is_entry AND event_row.request_class = 'human' THEN 1
    ELSE 0
  END;
  preview_count BIGINT := CASE WHEN event_row.request_class = 'link_preview' THEN 1 ELSE 0 END;
  bot_count BIGINT := CASE
    WHEN event_row.is_bot AND event_row.traffic_class = 'declared_bot' THEN 1
    ELSE 0
  END;
  suspected_count BIGINT := CASE
    WHEN event_row.traffic_class = 'suspected_automation' THEN 1
    ELSE 0
  END;
  error_count BIGINT := CASE WHEN event_row.status_code >= 400 THEN 1 ELSE 0 END;
BEGIN
  INSERT INTO link_stats_hourly_domain (
    bucket_start,
    source_id,
    analytics_id,
    entry_domain,
    requests,
    entry_requests,
    human_requests,
    entry_human_requests,
    preview_requests,
    bot_requests,
    suspected_automation_requests,
    asset_requests,
    unknown_requests,
    error_requests,
    latency_ms_sum
  )
  VALUES (
    bucket_hour,
    event_row.source_id,
    event_row.analytics_id,
    event_row.entry_domain,
    1,
    entry_count,
    human_count,
    entry_human_count,
    preview_count,
    bot_count,
    suspected_count,
    CASE WHEN event_row.resource_class = 'asset' THEN 1 ELSE 0 END,
    CASE WHEN event_row.request_class = 'unknown' THEN 1 ELSE 0 END,
    error_count,
    event_row.latency_ms
  )
  ON CONFLICT (bucket_start, source_id, analytics_id, entry_domain) DO UPDATE
  SET requests = link_stats_hourly_domain.requests + EXCLUDED.requests,
      entry_requests = link_stats_hourly_domain.entry_requests + EXCLUDED.entry_requests,
      human_requests = link_stats_hourly_domain.human_requests + EXCLUDED.human_requests,
      entry_human_requests = link_stats_hourly_domain.entry_human_requests + EXCLUDED.entry_human_requests,
      preview_requests = link_stats_hourly_domain.preview_requests + EXCLUDED.preview_requests,
      bot_requests = link_stats_hourly_domain.bot_requests + EXCLUDED.bot_requests,
      suspected_automation_requests = link_stats_hourly_domain.suspected_automation_requests + EXCLUDED.suspected_automation_requests,
      asset_requests = link_stats_hourly_domain.asset_requests + EXCLUDED.asset_requests,
      unknown_requests = link_stats_hourly_domain.unknown_requests + EXCLUDED.unknown_requests,
      error_requests = link_stats_hourly_domain.error_requests + EXCLUDED.error_requests,
      latency_ms_sum = link_stats_hourly_domain.latency_ms_sum + EXCLUDED.latency_ms_sum,
      updated_at = NOW();

  INSERT INTO link_stats_daily_country_domain (
    bucket_day, source_id, analytics_id, entry_domain, country_code,
    requests, entry_requests, human_requests, entry_human_requests,
    preview_requests, bot_requests, suspected_automation_requests, error_requests
  )
  VALUES (
    bucket_date, event_row.source_id, event_row.analytics_id, event_row.entry_domain,
    COALESCE(event_row.country_code, 'unknown'), 1, entry_count, human_count,
    entry_human_count, preview_count, bot_count, suspected_count, error_count
  )
  ON CONFLICT (bucket_day, source_id, analytics_id, entry_domain, country_code) DO UPDATE
  SET requests = link_stats_daily_country_domain.requests + EXCLUDED.requests,
      entry_requests = link_stats_daily_country_domain.entry_requests + EXCLUDED.entry_requests,
      human_requests = link_stats_daily_country_domain.human_requests + EXCLUDED.human_requests,
      entry_human_requests = link_stats_daily_country_domain.entry_human_requests + EXCLUDED.entry_human_requests,
      preview_requests = link_stats_daily_country_domain.preview_requests + EXCLUDED.preview_requests,
      bot_requests = link_stats_daily_country_domain.bot_requests + EXCLUDED.bot_requests,
      suspected_automation_requests = link_stats_daily_country_domain.suspected_automation_requests + EXCLUDED.suspected_automation_requests,
      error_requests = link_stats_daily_country_domain.error_requests + EXCLUDED.error_requests;

  INSERT INTO link_stats_daily_referrer_domain (
    bucket_day, source_id, analytics_id, entry_domain, referrer_domain,
    requests, entry_requests, human_requests, entry_human_requests,
    preview_requests, bot_requests, suspected_automation_requests, error_requests
  )
  VALUES (
    bucket_date, event_row.source_id, event_row.analytics_id, event_row.entry_domain,
    COALESCE(event_row.referrer_domain, 'direct'), 1, entry_count, human_count,
    entry_human_count, preview_count, bot_count, suspected_count, error_count
  )
  ON CONFLICT (bucket_day, source_id, analytics_id, entry_domain, referrer_domain) DO UPDATE
  SET requests = link_stats_daily_referrer_domain.requests + EXCLUDED.requests,
      entry_requests = link_stats_daily_referrer_domain.entry_requests + EXCLUDED.entry_requests,
      human_requests = link_stats_daily_referrer_domain.human_requests + EXCLUDED.human_requests,
      entry_human_requests = link_stats_daily_referrer_domain.entry_human_requests + EXCLUDED.entry_human_requests,
      preview_requests = link_stats_daily_referrer_domain.preview_requests + EXCLUDED.preview_requests,
      bot_requests = link_stats_daily_referrer_domain.bot_requests + EXCLUDED.bot_requests,
      suspected_automation_requests = link_stats_daily_referrer_domain.suspected_automation_requests + EXCLUDED.suspected_automation_requests,
      error_requests = link_stats_daily_referrer_domain.error_requests + EXCLUDED.error_requests;

  INSERT INTO link_stats_daily_device_domain (
    bucket_day, source_id, analytics_id, entry_domain, device_type,
    requests, entry_requests, human_requests, entry_human_requests,
    preview_requests, bot_requests, suspected_automation_requests, error_requests
  )
  VALUES (
    bucket_date, event_row.source_id, event_row.analytics_id, event_row.entry_domain,
    event_row.device_type, 1, entry_count, human_count, entry_human_count,
    preview_count, bot_count, suspected_count, error_count
  )
  ON CONFLICT (bucket_day, source_id, analytics_id, entry_domain, device_type) DO UPDATE
  SET requests = link_stats_daily_device_domain.requests + EXCLUDED.requests,
      entry_requests = link_stats_daily_device_domain.entry_requests + EXCLUDED.entry_requests,
      human_requests = link_stats_daily_device_domain.human_requests + EXCLUDED.human_requests,
      entry_human_requests = link_stats_daily_device_domain.entry_human_requests + EXCLUDED.entry_human_requests,
      preview_requests = link_stats_daily_device_domain.preview_requests + EXCLUDED.preview_requests,
      bot_requests = link_stats_daily_device_domain.bot_requests + EXCLUDED.bot_requests,
      suspected_automation_requests = link_stats_daily_device_domain.suspected_automation_requests + EXCLUDED.suspected_automation_requests,
      error_requests = link_stats_daily_device_domain.error_requests + EXCLUDED.error_requests;

  INSERT INTO link_stats_daily_provider_domain (
    bucket_day, source_id, analytics_id, entry_domain, provider,
    requests, entry_requests, human_requests, entry_human_requests,
    preview_requests, bot_requests, suspected_automation_requests, error_requests
  )
  VALUES (
    bucket_date, event_row.source_id, event_row.analytics_id, event_row.entry_domain,
    event_row.provider, 1, entry_count, human_count, entry_human_count,
    preview_count, bot_count, suspected_count, error_count
  )
  ON CONFLICT (bucket_day, source_id, analytics_id, entry_domain, provider) DO UPDATE
  SET requests = link_stats_daily_provider_domain.requests + EXCLUDED.requests,
      entry_requests = link_stats_daily_provider_domain.entry_requests + EXCLUDED.entry_requests,
      human_requests = link_stats_daily_provider_domain.human_requests + EXCLUDED.human_requests,
      entry_human_requests = link_stats_daily_provider_domain.entry_human_requests + EXCLUDED.entry_human_requests,
      preview_requests = link_stats_daily_provider_domain.preview_requests + EXCLUDED.preview_requests,
      bot_requests = link_stats_daily_provider_domain.bot_requests + EXCLUDED.bot_requests,
      suspected_automation_requests = link_stats_daily_provider_domain.suspected_automation_requests + EXCLUDED.suspected_automation_requests,
      error_requests = link_stats_daily_provider_domain.error_requests + EXCLUDED.error_requests;

  IF event_row.campaign_id IS NOT NULL THEN
    INSERT INTO link_stats_daily_campaign_domain (
      bucket_day, source_id, analytics_id, entry_domain, campaign_id,
      requests, entry_requests, human_requests, entry_human_requests,
      preview_requests, bot_requests, suspected_automation_requests, error_requests
    )
    VALUES (
      bucket_date, event_row.source_id, event_row.analytics_id, event_row.entry_domain,
      event_row.campaign_id, 1, entry_count, human_count, entry_human_count,
      preview_count, bot_count, suspected_count, error_count
    )
    ON CONFLICT (bucket_day, source_id, analytics_id, entry_domain, campaign_id) DO UPDATE
    SET requests = link_stats_daily_campaign_domain.requests + EXCLUDED.requests,
        entry_requests = link_stats_daily_campaign_domain.entry_requests + EXCLUDED.entry_requests,
        human_requests = link_stats_daily_campaign_domain.human_requests + EXCLUDED.human_requests,
        entry_human_requests = link_stats_daily_campaign_domain.entry_human_requests + EXCLUDED.entry_human_requests,
        preview_requests = link_stats_daily_campaign_domain.preview_requests + EXCLUDED.preview_requests,
        bot_requests = link_stats_daily_campaign_domain.bot_requests + EXCLUDED.bot_requests,
        suspected_automation_requests = link_stats_daily_campaign_domain.suspected_automation_requests + EXCLUDED.suspected_automation_requests,
        error_requests = link_stats_daily_campaign_domain.error_requests + EXCLUDED.error_requests;
  END IF;

  IF NOT event_row.is_entry THEN
    INSERT INTO link_stats_daily_upstream_domain (
      bucket_day, source_id, analytics_id, entry_domain,
      upstream_analytics_id, upstream_entry_domain, upstream_provider,
      requests, entry_requests, human_requests, entry_human_requests,
      preview_requests, bot_requests, suspected_automation_requests, error_requests
    )
    VALUES (
      bucket_date, event_row.source_id, event_row.analytics_id, event_row.entry_domain,
      event_row.upstream_analytics_id, event_row.upstream_entry_domain, event_row.upstream_provider,
      1, entry_count, human_count, entry_human_count,
      preview_count, bot_count, suspected_count, error_count
    )
    ON CONFLICT (
      bucket_day, source_id, analytics_id, entry_domain,
      upstream_analytics_id, upstream_entry_domain, upstream_provider
    ) DO UPDATE
    SET requests = link_stats_daily_upstream_domain.requests + EXCLUDED.requests,
        entry_requests = link_stats_daily_upstream_domain.entry_requests + EXCLUDED.entry_requests,
        human_requests = link_stats_daily_upstream_domain.human_requests + EXCLUDED.human_requests,
        entry_human_requests = link_stats_daily_upstream_domain.entry_human_requests + EXCLUDED.entry_human_requests,
        preview_requests = link_stats_daily_upstream_domain.preview_requests + EXCLUDED.preview_requests,
        bot_requests = link_stats_daily_upstream_domain.bot_requests + EXCLUDED.bot_requests,
        suspected_automation_requests = link_stats_daily_upstream_domain.suspected_automation_requests + EXCLUDED.suspected_automation_requests,
        error_requests = link_stats_daily_upstream_domain.error_requests + EXCLUDED.error_requests;
  END IF;
END;
$$;

SELECT analytics_rollup_link_domain(event_row)
FROM access_event AS event_row;

CREATE OR REPLACE FUNCTION analytics_rollup_link_domain_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM analytics_rollup_link_domain(NEW);
  RETURN NEW;
END;
$$;

CREATE TRIGGER access_event_rollup_domain_after_insert
AFTER INSERT ON access_event
FOR EACH ROW
EXECUTE FUNCTION analytics_rollup_link_domain_after_insert();
