CREATE TABLE IF NOT EXISTS analytics_source (
  source_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_link (
  source_id TEXT NOT NULL REFERENCES analytics_source(source_id),
  analytics_id TEXT NOT NULL,
  route_path TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('redirect', 'proxy')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_id, analytics_id)
);

CREATE INDEX IF NOT EXISTS analytics_link_source_path_idx
  ON analytics_link (source_id, route_path);

-- Raw events deliberately exclude IP addresses, full referrers, query strings, and user agents.
CREATE TABLE IF NOT EXISTS access_event (
  event_id UUID PRIMARY KEY,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  route_path TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('redirect', 'proxy')),
  provider TEXT NOT NULL CHECK (provider IN ('cloudflare', 'vercel', 'netlify', 'unknown')),
  request_class TEXT NOT NULL CHECK (
    request_class IN ('human', 'link_preview', 'crawler', 'monitor', 'asset', 'unknown')
  ),
  outcome TEXT NOT NULL CHECK (outcome = 'matched'),
  status_code INTEGER NOT NULL CHECK (status_code BETWEEN 100 AND 599),
  is_bot BOOLEAN NOT NULL,
  is_preview BOOLEAN NOT NULL,
  device_type TEXT NOT NULL CHECK (
    device_type IN ('desktop', 'mobile', 'tablet', 'bot', 'unknown')
  ),
  country_code TEXT CHECK (country_code ~ '^[A-Z]{2}$'),
  referrer_domain TEXT,
  latency_ms INTEGER NOT NULL CHECK (latency_ms BETWEEN 0 AND 3600000),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id),
  CHECK (is_bot = (request_class IN ('crawler', 'monitor'))),
  CHECK (is_preview = (request_class = 'link_preview')),
  CHECK ((device_type = 'bot') = (is_bot OR is_preview))
);

CREATE INDEX IF NOT EXISTS access_event_source_time_idx
  ON access_event (source_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS access_event_link_time_idx
  ON access_event (source_id, analytics_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS link_stats_hourly (
  bucket_start TIMESTAMPTZ NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  asset_requests BIGINT NOT NULL DEFAULT 0,
  unknown_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  latency_ms_sum BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bucket_start, source_id, analytics_id),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX IF NOT EXISTS link_stats_hourly_source_time_idx
  ON link_stats_hourly (source_id, bucket_start DESC);

CREATE TABLE IF NOT EXISTS link_stats_daily_country (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  country_code TEXT NOT NULL,
  requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, analytics_id, country_code),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX IF NOT EXISTS link_stats_daily_country_source_day_idx
  ON link_stats_daily_country (source_id, bucket_day DESC);

CREATE TABLE IF NOT EXISTS link_stats_daily_referrer (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  referrer_domain TEXT NOT NULL,
  requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, analytics_id, referrer_domain),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX IF NOT EXISTS link_stats_daily_referrer_source_day_idx
  ON link_stats_daily_referrer (source_id, bucket_day DESC);

CREATE TABLE IF NOT EXISTS link_stats_daily_device (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  device_type TEXT NOT NULL,
  requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, analytics_id, device_type),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX IF NOT EXISTS link_stats_daily_device_source_day_idx
  ON link_stats_daily_device (source_id, bucket_day DESC);

CREATE TABLE IF NOT EXISTS link_stats_daily_provider (
  bucket_day DATE NOT NULL,
  source_id TEXT NOT NULL,
  analytics_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('cloudflare', 'vercel', 'netlify', 'unknown')),
  requests BIGINT NOT NULL DEFAULT 0,
  human_requests BIGINT NOT NULL DEFAULT 0,
  preview_requests BIGINT NOT NULL DEFAULT 0,
  bot_requests BIGINT NOT NULL DEFAULT 0,
  error_requests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket_day, source_id, analytics_id, provider),
  FOREIGN KEY (source_id, analytics_id)
    REFERENCES analytics_link(source_id, analytics_id)
);

CREATE INDEX IF NOT EXISTS link_stats_daily_provider_source_day_idx
  ON link_stats_daily_provider (source_id, bucket_day DESC);
