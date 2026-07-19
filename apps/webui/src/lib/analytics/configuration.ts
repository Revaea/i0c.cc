import "server-only";

const sourceIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function readAnalyticsSourceId(): string | null {
  const sourceId = process.env.ANALYTICS_SOURCE_ID?.trim();
  return sourceId && sourceIdPattern.test(sourceId) ? sourceId : null;
}

export function readAnalyticsIngestSecret(): string | null {
  const secret = process.env.ANALYTICS_INGEST_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}
