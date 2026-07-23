import "server-only";

import {
  defaultDataConfig,
} from "@i0c/config";
import type { DataConfig } from "@i0c/config";

import {
  getAppDataConfig,
  type GitHubDataDocumentPayload,
} from "@/lib/github";
import { validateInstanceDataConfig } from "@/lib/configuration/validation";
import { resolveWebUiPlugins } from "@/lib/plugins/registry";

import { EffectiveDataConfigCache } from "./effective-data-config-cache";

interface DataConfigDocument {
  config: DataConfig;
  document: GitHubDataDocumentPayload;
}

const effectiveDataConfigCache = new EffectiveDataConfigCache({
  adoptCacheSeconds: 5,
  defaultConfig: defaultDataConfig,
  failureRetrySeconds: 10,
  loadRemote: async () => (await readDataConfigDocument()).config,
  onLoadError: (error) => {
    console.error("Failed to load remote instance config", error);
  },
  successCacheSeconds: () => 0,
});

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
  return (await effectiveDataConfigCache.get()).config;
}

export function getAuthoritativeDataConfig(): Promise<DataConfig> {
  return effectiveDataConfigCache.getAuthoritative();
}

export function adoptDataConfigCache(config: DataConfig): void {
  effectiveDataConfigCache.adopt(config);
}

export function parseDataConfig(content: string): DataConfig {
  let value: unknown;
  try {
    value = JSON.parse(content) as unknown;
  } catch {
    throw new Error("Instance config must be valid JSON");
  }

  const result = validateInstanceDataConfig(value);
  if (result.status === "valid") {
    resolveWebUiPlugins(result.config);
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
