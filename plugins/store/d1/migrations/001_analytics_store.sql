PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS analytics_source (
  source_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS analytics_link (
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  route_path TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('redirect', 'proxy')),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (source_id, analytics_id),
  FOREIGN KEY (source_id) REFERENCES analytics_source(source_id)
);

CREATE TABLE IF NOT EXISTS analytics_upstream_claim (
  source_id TEXT NOT NULL,
  upstream_event_id TEXT NOT NULL,
  downstream_event_id TEXT NOT NULL,
  upstream_analytics_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (source_id, upstream_event_id)
);

CREATE TABLE IF NOT EXISTS analytics_event (
  event_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  event_kind TEXT NOT NULL CHECK (event_kind IN ('link', 'runtime')),
  source_id TEXT NOT NULL,
  analytics_id TEXT,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  route_path TEXT,
  link_type TEXT,
  entry_domain TEXT NOT NULL,
  provider TEXT NOT NULL,
  request_class TEXT,
  status_code INTEGER NOT NULL CHECK (status_code BETWEEN 100 AND 599),
  resource_class TEXT NOT NULL,
  match_kind TEXT NOT NULL,
  match_outcome TEXT NOT NULL,
  traffic_class TEXT NOT NULL,
  bot_category TEXT NOT NULL,
  bot_confidence TEXT NOT NULL,
  classifier_version INTEGER NOT NULL,
  device_type TEXT NOT NULL,
  country_code TEXT,
  referrer_domain TEXT,
  campaign_id TEXT,
  upstream_event_id TEXT,
  upstream_analytics_id TEXT,
  is_entry INTEGER NOT NULL CHECK (is_entry IN (0, 1)),
  probe_category TEXT NOT NULL,
  sample_rate REAL NOT NULL CHECK (sample_rate > 0 AND sample_rate <= 1),
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
  FOREIGN KEY (source_id) REFERENCES analytics_source(source_id),
  CHECK (
    (event_kind = 'link' AND analytics_id IS NOT NULL AND route_path IS NOT NULL AND link_type IS NOT NULL)
    OR (event_kind = 'runtime' AND analytics_id IS NULL AND route_path IS NULL AND link_type IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS analytics_event_source_time_idx
  ON analytics_event (source_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_event_source_domain_time_idx
  ON analytics_event (source_id, entry_domain, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_event_link_time_idx
  ON analytics_event (source_id, analytics_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_event_received_idx
  ON analytics_event (received_at);

CREATE TABLE IF NOT EXISTS analytics_stats_hourly (
  bucket_start TEXT NOT NULL,
  source_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  observed_requests INTEGER NOT NULL DEFAULT 0,
  estimated_requests REAL NOT NULL DEFAULT 0,
  error_observed_requests INTEGER NOT NULL DEFAULT 0,
  error_estimated_requests REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_start, source_id, entry_domain, analytics_id)
);

CREATE TABLE IF NOT EXISTS analytics_stats_daily (
  bucket_day TEXT NOT NULL,
  source_id TEXT NOT NULL,
  entry_domain TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  observed_requests INTEGER NOT NULL DEFAULT 0,
  estimated_requests REAL NOT NULL DEFAULT 0,
  error_observed_requests INTEGER NOT NULL DEFAULT 0,
  error_estimated_requests REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, entry_domain, analytics_id)
);

CREATE TRIGGER IF NOT EXISTS analytics_event_rollup_hourly_after_insert
AFTER INSERT ON analytics_event
BEGIN
  INSERT INTO analytics_stats_hourly (
    bucket_start,
    source_id,
    entry_domain,
    analytics_id,
    observed_requests,
    estimated_requests,
    error_observed_requests,
    error_estimated_requests
  )
  VALUES (
    SUBSTR(NEW.occurred_at, 1, 13) || ':00:00.000Z',
    NEW.source_id,
    NEW.entry_domain,
    COALESCE(NEW.analytics_id, ''),
    1,
    1.0 / NEW.sample_rate,
    CASE WHEN NEW.status_code >= 400 THEN 1 ELSE 0 END,
    CASE WHEN NEW.status_code >= 400 THEN 1.0 / NEW.sample_rate ELSE 0 END
  )
  ON CONFLICT (bucket_start, source_id, entry_domain, analytics_id) DO UPDATE SET
    observed_requests = observed_requests + excluded.observed_requests,
    estimated_requests = estimated_requests + excluded.estimated_requests,
    error_observed_requests = error_observed_requests + excluded.error_observed_requests,
    error_estimated_requests = error_estimated_requests + excluded.error_estimated_requests;
END;

CREATE TRIGGER IF NOT EXISTS analytics_event_rollup_daily_after_insert
AFTER INSERT ON analytics_event
BEGIN
  INSERT INTO analytics_stats_daily (
    bucket_day,
    source_id,
    entry_domain,
    analytics_id,
    observed_requests,
    estimated_requests,
    error_observed_requests,
    error_estimated_requests
  )
  VALUES (
    SUBSTR(NEW.occurred_at, 1, 10),
    NEW.source_id,
    NEW.entry_domain,
    COALESCE(NEW.analytics_id, ''),
    1,
    1.0 / NEW.sample_rate,
    CASE WHEN NEW.status_code >= 400 THEN 1 ELSE 0 END,
    CASE WHEN NEW.status_code >= 400 THEN 1.0 / NEW.sample_rate ELSE 0 END
  )
  ON CONFLICT (bucket_day, source_id, entry_domain, analytics_id) DO UPDATE SET
    observed_requests = observed_requests + excluded.observed_requests,
    estimated_requests = estimated_requests + excluded.estimated_requests,
    error_observed_requests = error_observed_requests + excluded.error_observed_requests,
    error_estimated_requests = error_estimated_requests + excluded.error_estimated_requests;
END;
