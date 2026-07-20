export type RouteMode = "string" | "object" | "array";
export type DestinationKey = "target" | "to" | "url";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeStatus(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" ? value : "";
}

export function normalizePriority(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" ? value : "";
}

export function getMode(value: unknown): RouteMode {
  if (Array.isArray(value)) return "array";
  if (isRecord(value)) return "object";
  return "string";
}

export function createAnalyticsId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return "00000000-0000-4000-8000-000000000000".replace(/[08]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const digit = Number(character);
    return (digit ^ (randomValue & (15 >> (digit / 4)))).toString(16);
  });
}

export function ensureAnalyticsId(config: Record<string, unknown>): Record<string, unknown> {
  if (typeof config.analyticsId === "string" && config.analyticsId.trim() !== "") {
    return config;
  }

  return { ...config, analyticsId: createAnalyticsId() };
}

export function createEmptyConfig(): Record<string, unknown> {
  return {
    analyticsId: createAnalyticsId(),
    type: "prefix",
    target: "",
    appendPath: true,
  };
}

export function getDestinationKey(config: Record<string, unknown>): DestinationKey {
  if (typeof config.target === "string") return "target";
  if (typeof config.to === "string") return "to";
  if (typeof config.url === "string") return "url";
  return "target";
}

export function setExclusiveDestination(
  config: Record<string, unknown>,
  key: DestinationKey,
  value: string
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config };
  delete next.target;
  delete next.to;
  delete next.url;
  next[key] = value;
  return next;
}
