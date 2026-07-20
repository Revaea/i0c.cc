import "server-only";

const hostnameLabelPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function normalizeAnalyticsSourceId(value: string): string | null {
  const sourceId = value.trim().toLowerCase().replace(/\.+$/, "");
  if (sourceId.length === 0 || sourceId.length > 253) {
    return null;
  }

  const labels = sourceId.split(".");
  return labels.every((label) => label.length <= 63 && hostnameLabelPattern.test(label))
    ? sourceId
    : null;
}

export function readAnalyticsSourceId(): string | null {
  const sourceId = process.env.ANALYTICS_SOURCE_ID;
  return sourceId ? normalizeAnalyticsSourceId(sourceId) : null;
}

export function readAnalyticsIngestSecret(): string | null {
  const secret = process.env.ANALYTICS_INGEST_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}
