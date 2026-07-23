-- Existing providers were produced under stricter event constraints. NOT VALID
-- avoids scanning populated tables while the replacement checks protect new writes.

ALTER TABLE access_event
  DROP CONSTRAINT IF EXISTS access_event_provider_check,
  DROP CONSTRAINT IF EXISTS access_event_upstream_provider_check,
  ADD CONSTRAINT access_event_provider_check CHECK (
    CHAR_LENGTH(provider) BETWEEN 1 AND 64
    AND provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
  ) NOT VALID,
  ADD CONSTRAINT access_event_upstream_provider_check CHECK (
    upstream_provider IS NULL
    OR (
      CHAR_LENGTH(upstream_provider) BETWEEN 1 AND 64
      AND upstream_provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
    )
  ) NOT VALID;

ALTER TABLE link_stats_daily_provider
  DROP CONSTRAINT IF EXISTS link_stats_daily_provider_provider_check,
  ADD CONSTRAINT link_stats_daily_provider_provider_check CHECK (
    CHAR_LENGTH(provider) BETWEEN 1 AND 64
    AND provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
  ) NOT VALID;

ALTER TABLE analytics_upstream_claim
  DROP CONSTRAINT IF EXISTS analytics_upstream_claim_upstream_provider_check,
  ADD CONSTRAINT analytics_upstream_claim_upstream_provider_check CHECK (
    CHAR_LENGTH(upstream_provider) BETWEEN 1 AND 64
    AND upstream_provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
  ) NOT VALID;

ALTER TABLE link_stats_daily_provider_domain
  DROP CONSTRAINT IF EXISTS link_stats_daily_provider_domain_provider_check,
  ADD CONSTRAINT link_stats_daily_provider_domain_provider_check CHECK (
    CHAR_LENGTH(provider) BETWEEN 1 AND 64
    AND provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
  ) NOT VALID;

ALTER TABLE link_stats_daily_upstream_domain
  DROP CONSTRAINT IF EXISTS link_stats_daily_upstream_domain_upstream_provider_check,
  ADD CONSTRAINT link_stats_daily_upstream_domain_upstream_provider_check CHECK (
    CHAR_LENGTH(upstream_provider) BETWEEN 1 AND 64
    AND upstream_provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
  ) NOT VALID;

ALTER TABLE runtime_event
  DROP CONSTRAINT IF EXISTS runtime_event_provider_check,
  ADD CONSTRAINT runtime_event_provider_check CHECK (
    CHAR_LENGTH(provider) BETWEEN 1 AND 64
    AND provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
  ) NOT VALID;

ALTER TABLE runtime_stats_hourly
  ADD CONSTRAINT runtime_stats_hourly_provider_check CHECK (
    CHAR_LENGTH(provider) BETWEEN 1 AND 64
    AND provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
  ) NOT VALID;

ALTER TABLE runtime_stats_daily_bot
  ADD CONSTRAINT runtime_stats_daily_bot_provider_check CHECK (
    CHAR_LENGTH(provider) BETWEEN 1 AND 64
    AND provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
  ) NOT VALID;

ALTER TABLE link_stats_daily_bot
  ADD CONSTRAINT link_stats_daily_bot_provider_check CHECK (
    CHAR_LENGTH(provider) BETWEEN 1 AND 64
    AND provider ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
  ) NOT VALID;
