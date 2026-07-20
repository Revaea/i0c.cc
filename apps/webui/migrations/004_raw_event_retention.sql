CREATE INDEX access_event_received_idx
  ON access_event (received_at);

CREATE INDEX runtime_event_received_idx
  ON runtime_event (received_at);

CREATE INDEX analytics_event_receipt_received_idx
  ON analytics_event_receipt (received_at);

CREATE INDEX analytics_upstream_claim_last_seen_idx
  ON analytics_upstream_claim (last_seen_at);

CREATE OR REPLACE FUNCTION analytics_prune_raw_events()
RETURNS TABLE (
  cutoff_at TIMESTAMPTZ,
  access_events_deleted BIGINT,
  runtime_events_deleted BIGINT,
  event_receipts_deleted BIGINT,
  upstream_claims_deleted BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  retention_cutoff TIMESTAMPTZ := NOW() - INTERVAL '181 days';
BEGIN
  DELETE FROM access_event
  WHERE received_at < retention_cutoff;
  GET DIAGNOSTICS access_events_deleted = ROW_COUNT;

  DELETE FROM runtime_event
  WHERE received_at < retention_cutoff;
  GET DIAGNOSTICS runtime_events_deleted = ROW_COUNT;

  DELETE FROM analytics_upstream_claim
  WHERE last_seen_at < retention_cutoff;
  GET DIAGNOSTICS upstream_claims_deleted = ROW_COUNT;

  DELETE FROM analytics_event_receipt
  WHERE received_at < retention_cutoff;
  GET DIAGNOSTICS event_receipts_deleted = ROW_COUNT;

  cutoff_at := retention_cutoff;
  RETURN NEXT;
END;
$$;
