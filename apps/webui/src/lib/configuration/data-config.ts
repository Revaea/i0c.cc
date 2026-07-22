import "server-only";

import {
  defaultDataConfig,
  validateDataConfig,
} from "@i0c/config";
import type { DataConfig } from "@i0c/config";

import {
  getAppDataConfig,
  type GitHubDataDocumentPayload,
} from "@/lib/github";

interface DataConfigDocument {
  config: DataConfig;
  document: GitHubDataDocumentPayload;
}

interface DataConfigCacheEntry {
  config: DataConfig;
  expiresAt: number;
}

let cachedDataConfig: DataConfigCacheEntry | undefined;
let inFlightDataConfig: Promise<DataConfig> | undefined;

export async function readDataConfigDocument(
  accessToken?: string,
): Promise<DataConfigDocument> {
  const document = await readRawDataConfigDocument(accessToken);
  return {
    config: parseDataConfig(document.content),
    document,
  };
}

export function readRawDataConfigDocument(
  accessToken?: string,
): Promise<GitHubDataDocumentPayload> {
  return getAppDataConfig(accessToken);
}

export async function getEffectiveDataConfig(): Promise<DataConfig> {
  const now = Date.now();
  if (cachedDataConfig && cachedDataConfig.expiresAt > now) {
    return cachedDataConfig.config;
  }
  if (inFlightDataConfig) {
    return inFlightDataConfig;
  }

  const load = loadEffectiveDataConfig(now);
  inFlightDataConfig = load;
  try {
    return await load;
  } finally {
    if (inFlightDataConfig === load) {
      inFlightDataConfig = undefined;
    }
  }
}

export function invalidateDataConfigCache(): void {
  cachedDataConfig = undefined;
}

export function parseDataConfig(content: string): DataConfig {
  let value: unknown;
  try {
    value = JSON.parse(content) as unknown;
  } catch {
    throw new Error("Instance config must be valid JSON");
  }

  const result = validateDataConfig(value);
  if (result.status === "valid") {
    return result.config;
  }

  const shownIssues = result.issues
    .slice(0, 5)
    .map((item) => `${item.path}: ${item.message}`);
  const remainingCount = result.issues.length - shownIssues.length;
  const details = [
    ...shownIssues,
    ...(remainingCount > 0 ? [`and ${remainingCount} more`] : []),
  ].join("; ");
  throw new Error(`Instance config validation failed: ${details}`);
}

async function loadEffectiveDataConfig(now: number): Promise<DataConfig> {
  try {
    const { config } = await readDataConfigDocument();
    cachedDataConfig = {
      config,
      expiresAt: Date.now() + config.runtime.configCacheTtlSeconds * 1000,
    };
    return config;
  } catch (error) {
    console.error("Failed to load remote instance config", error);
    const config = cachedDataConfig?.config ?? defaultDataConfig;
    cachedDataConfig = {
      config,
      expiresAt: now + Math.min(60, config.runtime.configCacheTtlSeconds) * 1000,
    };
    return config;
  }
}
